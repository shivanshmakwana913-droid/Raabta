const mongoose = require('mongoose');
const Plan = require('../models/Plan');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// @desc    Create a new plan/event inside a conversation
// @route   POST /api/plans
// @access  Private
const createPlan = async (req, res, next) => {
  try {
    const { conversationId, title, date } = req.body;

    if (!title || !title.trim()) {
      res.status(400);
      throw new Error('Plan title is required');
    }

    if (!date || isNaN(new Date(date).getTime())) {
      res.status(400);
      throw new Error('Valid plan date and time are required');
    }

    const convId = conversationId || req.params.conversationId;
    if (!convId || !mongoose.Types.ObjectId.isValid(convId)) {
      res.status(400);
      throw new Error('Valid conversation ID is required');
    }

    const conversation = await Conversation.findById(convId);
    if (!conversation) {
      res.status(404);
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      res.status(403);
      throw new Error('Unauthorized: You are not a participant in this conversation');
    }

    const plan = await Plan.create({
      conversation: convId,
      creator: req.user._id,
      title: title.trim(),
      date: new Date(date),
      responses: [
        {
          user: req.user._id,
          status: 'going'
        }
      ]
    });

    const message = await Message.create({
      conversation: convId,
      sender: req.user._id,
      content: title.trim(),
      messageType: 'plan',
      plan: plan._id,
      deliveredAt: new Date()
    });

    await Conversation.findByIdAndUpdate(convId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    const populatedPlan = await Plan.findById(plan._id)
      .populate('creator', 'name username avatar')
      .populate('responses.user', 'name username avatar');

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username avatar')
      .populate({
        path: 'plan',
        populate: [
          { path: 'creator', select: 'name username avatar' },
          { path: 'responses.user', select: 'name username avatar' }
        ]
      });

    const io = req.app.get('io');
    if (io) {
      io.to(convId.toString()).emit('new_message', populatedMessage);
      io.to(convId.toString()).emit('plan_created', populatedPlan);
    }

    res.status(201).json({
      plan: populatedPlan,
      message: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all plans for a conversation
// @route   GET /api/plans/conversation/:conversationId
// @route   GET /api/conversations/:conversationId/plans
// @access  Private
const getPlansForConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400);
      throw new Error('Valid conversation ID is required');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404);
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      res.status(403);
      throw new Error('Unauthorized: You are not a participant in this conversation');
    }

    const plans = await Plan.find({ conversation: conversationId })
      .populate('creator', 'name username avatar')
      .populate('responses.user', 'name username avatar')
      .sort({ createdAt: -1 });

    res.status(200).json(plans);
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to a plan (going, maybe, cant_go)
// @route   PUT /api/plans/:id/respond
// @access  Private
const respondToPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['going', 'maybe', 'cant_go'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400);
      throw new Error('Invalid status. Must be one of: going, maybe, cant_go');
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Valid plan ID is required');
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      res.status(404);
      throw new Error('Plan not found');
    }

    const conversation = await Conversation.findById(plan.conversation);
    if (!conversation) {
      res.status(404);
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      res.status(403);
      throw new Error('Unauthorized: You are not a participant in this conversation');
    }

    const existingIndex = plan.responses.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex > -1) {
      plan.responses[existingIndex].status = status;
    } else {
      plan.responses.push({
        user: req.user._id,
        status
      });
    }

    await plan.save();

    const populatedPlan = await Plan.findById(plan._id)
      .populate('creator', 'name username avatar')
      .populate('responses.user', 'name username avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(plan.conversation.toString()).emit('plan_updated', populatedPlan);
    }

    res.status(200).json(populatedPlan);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPlan,
  getPlansForConversation,
  respondToPlan
};
