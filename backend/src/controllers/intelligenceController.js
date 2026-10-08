const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Memory = require('../models/Memory');
const FollowUp = require('../models/FollowUp');
const { generateChatSummary } = require('../services/aiService');
const mongoose = require('mongoose');

// Helper to check conversation membership
const verifyParticipant = async (conversationId, userId) => {
  if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
    const error = new Error('Invalid conversation ID');
    error.status = 400;
    throw error;
  }
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.status = 404;
    throw error;
  }
  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString()
  );
  if (!isParticipant) {
    const error = new Error('Unauthorized: You are not a participant in this conversation');
    error.status = 403;
    throw error;
  }
  return conversation;
};

// @desc    Set or remove category on a message
// @route   PATCH /api/messages/:id/category
// @access  Private
const updateMessageCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    const allowedCategories = ['important', 'task', 'payment', 'event', 'study', null];
    if (category !== null && !allowedCategories.includes(category)) {
      res.status(400);
      throw new Error('Invalid category type');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid message ID format');
    }

    const message = await Message.findById(id);
    if (!message || message.isDeleted) {
      res.status(404);
      throw new Error('Message not found or deleted');
    }

    await verifyParticipant(message.conversation, req.user._id);

    message.category = category;
    await message.save();

    const updated = await Message.findById(message._id)
      .populate('sender', 'name username avatar')
      .populate({
        path: 'replyTo',
        select: 'content messageType imageUrl audioUrl audioDuration sender isDeleted',
        populate: { path: 'sender', select: 'name username avatar' }
      })
      .populate('reactions.user', 'name username avatar')
      .populate({
        path: 'plan',
        populate: [
          { path: 'creator', select: 'name username avatar' },
          { path: 'responses.user', select: 'name username avatar' }
        ]
      });

    // Notify socket clients if socket server exists
    const io = req.app.get('io');
    if (io) {
      io.to(message.conversation.toString()).emit('message_updated', updated);
    }

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Get categorized messages in a conversation
// @route   GET /api/messages/category/:conversationId
// @access  Private
const getCategorizedMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { category } = req.query;

    await verifyParticipant(conversationId, req.user._id);

    const filter = {
      conversation: conversationId,
      isDeleted: false,
      category: category ? category : { $ne: null }
    };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .populate('sender', 'name username avatar');

    res.status(200).json({ messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Chat Memory
// @route   POST /api/intelligence/memories
// @access  Private
const createMemory = async (req, res, next) => {
  try {
    const { conversationId, messageId, text } = req.body;

    if (!text || text.trim() === '') {
      res.status(400);
      throw new Error('Memory text content is required');
    }

    await verifyParticipant(conversationId, req.user._id);

    let validMessageId = null;
    if (messageId) {
      if (mongoose.Types.ObjectId.isValid(messageId)) {
        const msg = await Message.findById(messageId);
        if (msg && msg.conversation.toString() === conversationId.toString()) {
          validMessageId = messageId;
        }
      }
    }

    const memory = await Memory.create({
      conversation: conversationId,
      user: req.user._id,
      message: validMessageId,
      text: text.trim()
    });

    const populated = await Memory.findById(memory._id)
      .populate('user', 'name username avatar')
      .populate({
        path: 'message',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Get memories for a conversation
// @route   GET /api/intelligence/memories/:conversationId
// @access  Private
const getMemories = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await verifyParticipant(conversationId, req.user._id);

    const memories = await Memory.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .populate('user', 'name username avatar')
      .populate({
        path: 'message',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    res.status(200).json({ memories });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a memory
// @route   DELETE /api/intelligence/memories/:id
// @access  Private
const deleteMemory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid memory ID format');
    }

    const memory = await Memory.findById(id);
    if (!memory) {
      res.status(404);
      throw new Error('Memory not found');
    }

    await verifyParticipant(memory.conversation, req.user._id);

    await Memory.findByIdAndDelete(id);

    res.status(200).json({ status: 'ok', id });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Smart Task / Follow-up / Reminder from Message
// @route   POST /api/intelligence/followups
// @access  Private
const createFollowUp = async (req, res, next) => {
  try {
    const { conversationId, messageId, title, actionType = 'task', assignees = [], note, dueDate } = req.body;

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      res.status(400);
      throw new Error('Valid message ID is required for task creation');
    }

    await verifyParticipant(conversationId, req.user._id);

    const message = await Message.findById(messageId);
    if (!message || message.conversation.toString() !== conversationId.toString()) {
      res.status(404);
      throw new Error('Referenced message not found in this conversation');
    }

    const followUp = await FollowUp.create({
      conversation: conversationId,
      user: req.user._id,
      message: messageId,
      title: title ? title.trim() : (message.content ? message.content.substring(0, 80) : 'Action Item'),
      actionType: ['task', 'reminder', 'plan'].includes(actionType) ? actionType : 'task',
      assignees: Array.isArray(assignees) ? assignees.filter((id) => mongoose.Types.ObjectId.isValid(id)) : [],
      note: note ? note.trim() : '',
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending'
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate('user', 'name username avatar')
      .populate('assignees', 'name username avatar')
      .populate({
        path: 'message',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    const io = req.app.get('io');
    if (io) {
      io.to(conversationId.toString()).emit('action_updated', populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's follow-ups / tasks for a conversation
// @route   GET /api/intelligence/followups/:conversationId
// @access  Private
const getFollowUps = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await verifyParticipant(conversationId, req.user._id);

    const followUps = await FollowUp.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .populate('user', 'name username avatar')
      .populate('assignees', 'name username avatar')
      .populate({
        path: 'message',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    res.status(200).json({ followUps });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task/follow-up status, title, assignees or note
// @route   PATCH /api/intelligence/followups/:id
// @access  Private
const updateFollowUp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, title, note, dueDate, assignees } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid action item ID');
    }

    const followUp = await FollowUp.findById(id);
    if (!followUp) {
      res.status(404);
      throw new Error('Action item not found');
    }

    await verifyParticipant(followUp.conversation, req.user._id);

    if (status && ['pending', 'completed', 'cancelled'].includes(status)) {
      followUp.status = status;
    }

    if (typeof title === 'string') {
      followUp.title = title.trim();
    }

    if (typeof note === 'string') {
      followUp.note = note.trim();
    }

    if (dueDate !== undefined) {
      followUp.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (Array.isArray(assignees)) {
      followUp.assignees = assignees.filter((aId) => mongoose.Types.ObjectId.isValid(aId));
    }

    await followUp.save();

    const updated = await FollowUp.findById(followUp._id)
      .populate('user', 'name username avatar')
      .populate('assignees', 'name username avatar')
      .populate({
        path: 'message',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    const io = req.app.get('io');
    if (io) {
      io.to(followUp.conversation.toString()).emit('action_updated', updated);
    }

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a follow-up
// @route   DELETE /api/intelligence/followups/:id
// @access  Private
const deleteFollowUp = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid follow-up ID');
    }

    const followUp = await FollowUp.findById(id);
    if (!followUp) {
      res.status(404);
      throw new Error('Follow-up not found');
    }

    if (followUp.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Unauthorized to delete this follow-up');
    }

    await FollowUp.findByIdAndDelete(id);

    res.status(200).json({ status: 'ok', id });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI Chat Summary or Group "What Did I Miss?"
// @route   POST /api/intelligence/summary
// @access  Private
const getChatSummary = async (req, res, next) => {
  try {
    const { conversationId, mode = 'summary', limit = 40 } = req.body;

    const conversation = await verifyParticipant(conversationId, req.user._id);

    if (mode === 'missed' && conversation.type !== 'group') {
      res.status(400);
      throw new Error('"What did I miss?" is only supported for group conversations');
    }

    let filter = { conversation: conversationId, isDeleted: false };

    // For "missed", try fetching unseen messages by current user, or fallback to recent 40 messages
    let queryLimit = Math.min(parseInt(limit, 10) || 40, 100);

    if (mode === 'missed') {
      const unseenCount = await Message.countDocuments({
        conversation: conversationId,
        sender: { $ne: req.user._id },
        seenAt: null
      });

      if (unseenCount > 0) {
        queryLimit = Math.min(unseenCount, 60);
      }
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(queryLimit)
      .populate('sender', 'name username');

    // Reverse so messages are chronological for AI transcript
    messages.reverse();

    const summaryResult = await generateChatSummary(messages, {
      isGroup: conversation.type === 'group',
      mode
    });

    res.status(200).json(summaryResult);
  } catch (error) {
    next(error);
  }
};

// --- DECISION LOCK CONTROLLERS ---

// @desc    Propose a decision from a message
// @route   POST /api/intelligence/decisions
// @access  Private
const createDecision = async (req, res, next) => {
  try {
    const { conversationId, messageId, decisionText } = req.body;

    if (!decisionText || decisionText.trim() === '') {
      res.status(400);
      throw new Error('Decision text is required');
    }

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      res.status(400);
      throw new Error('Valid source message ID is required');
    }

    await verifyParticipant(conversationId, req.user._id);

    const Decision = require('../models/Decision');

    const decision = await Decision.create({
      conversation: conversationId,
      proposer: req.user._id,
      message: messageId,
      decisionText: decisionText.trim(),
      status: 'proposed'
    });

    const populated = await Decision.findById(decision._id)
      .populate('proposer', 'name username avatar')
      .populate('confirmer', 'name username avatar')
      .populate({
        path: 'message',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    const io = req.app.get('io');
    if (io) {
      io.to(conversationId.toString()).emit('decision_updated', populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm or reject a decision
// @route   PATCH /api/intelligence/decisions/:id
// @access  Private
const updateDecisionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'confirmed' | 'rejected' | 'proposed'

    if (!['confirmed', 'rejected', 'proposed'].includes(status)) {
      res.status(400);
      throw new Error('Invalid decision status');
    }

    const Decision = require('../models/Decision');

    const decision = await Decision.findById(id);
    if (!decision) {
      res.status(404);
      throw new Error('Decision not found');
    }

    await verifyParticipant(decision.conversation, req.user._id);

    decision.status = status;
    if (status === 'confirmed') {
      decision.confirmer = req.user._id;
      decision.confirmedAt = new Date();
    } else if (status === 'rejected') {
      decision.confirmer = req.user._id;
      decision.confirmedAt = null;
    } else {
      decision.confirmer = null;
      decision.confirmedAt = null;
    }

    await decision.save();

    const updated = await Decision.findById(decision._id)
      .populate('proposer', 'name username avatar')
      .populate('confirmer', 'name username avatar')
      .populate({
        path: 'message',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    const io = req.app.get('io');
    if (io) {
      io.to(decision.conversation.toString()).emit('decision_updated', updated);
    }

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Get decisions for a conversation
// @route   GET /api/intelligence/decisions/:conversationId
// @access  Private
const getDecisions = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await verifyParticipant(conversationId, req.user._id);

    const Decision = require('../models/Decision');

    const decisions = await Decision.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .populate('proposer', 'name username avatar')
      .populate('confirmer', 'name username avatar')
      .populate({
        path: 'message',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    res.status(200).json({ decisions });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a decision
// @route   DELETE /api/intelligence/decisions/:id
// @access  Private
const deleteDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const Decision = require('../models/Decision');

    const decision = await Decision.findById(id);
    if (!decision) {
      res.status(404);
      throw new Error('Decision not found');
    }

    await verifyParticipant(decision.conversation, req.user._id);

    await Decision.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io) {
      io.to(decision.conversation.toString()).emit('decision_deleted', { id, conversationId: decision.conversation });
    }

    res.status(200).json({ status: 'ok', id });
  } catch (error) {
    next(error);
  }
};

// --- CONTEXT ACTIONS DASHBOARD ---

// @desc    Get unified Context Actions Dashboard (Tasks, Plans, Decisions, Deadlines)
// @route   GET /api/intelligence/dashboard/:conversationId
// @access  Private
const getActionsDashboard = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await verifyParticipant(conversationId, req.user._id);

    const Decision = require('../models/Decision');
    const Plan = require('../models/Plan');

    // Fetch Tasks & Follow-ups
    const tasks = await FollowUp.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .populate('user', 'name username avatar')
      .populate('assignees', 'name username avatar')
      .populate({
        path: 'message',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    // Fetch Decisions
    const decisions = await Decision.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .populate('proposer', 'name username avatar')
      .populate('confirmer', 'name username avatar')
      .populate({
        path: 'message',
        select: 'content sender messageType createdAt',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    // Fetch Raabta Plans
    const plans = await Plan.find({ conversation: conversationId })
      .sort({ date: 1 })
      .populate('creator', 'name username avatar')
      .populate('responses.user', 'name username avatar');

    const stats = {
      pendingTasks: tasks.filter((t) => t.status === 'pending').length,
      completedTasks: tasks.filter((t) => t.status === 'completed').length,
      confirmedDecisions: decisions.filter((d) => d.status === 'confirmed').length,
      proposedDecisions: decisions.filter((d) => d.status === 'proposed').length,
      totalPlans: plans.length
    };

    res.status(200).json({
      tasks,
      decisions,
      plans,
      stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateMessageCategory,
  getCategorizedMessages,
  createMemory,
  getMemories,
  deleteMemory,
  createFollowUp,
  getFollowUps,
  updateFollowUp,
  deleteFollowUp,
  getChatSummary,
  createDecision,
  updateDecisionStatus,
  getDecisions,
  deleteDecision,
  getActionsDashboard
};
