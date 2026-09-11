const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Message = require('../models/Message');
const mongoose = require('mongoose');

// @desc    Create or access a 1-on-1 direct conversation
// @route   POST /api/conversations
// @access  Private
const accessConversation = async (req, res, next) => {
  try {
    const { userId, targetUserId } = req.body;
    const recipientId = userId || targetUserId;

    if (!recipientId) {
      res.status(400);
      throw new Error('Target User ID is required');
    }

    if (recipientId.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error('Cannot create a conversation with yourself');
    }

    // Verify recipient user exists
    const recipientUser = await User.findById(recipientId);
    if (!recipientUser || recipientUser.isDeleted) {
      res.status(404);
      throw new Error('Recipient user not found');
    }

    // Check if target user has blocked current user
    if (recipientUser.blockedUsers && recipientUser.blockedUsers.some(id => id.toString() === req.user._id.toString())) {
      res.status(403);
      throw new Error('You cannot initiate a conversation with this user');
    }

    // Find existing direct conversation between req.user._id and recipientId
    let isConversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user._id, recipientId] }
    })
      .populate('participants', 'name username avatar isOnline lastSeen')
      .populate('groupAdmin', 'name username avatar')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name username avatar'
        }
      });

    if (isConversation) {
      const unreadCount = await Message.countDocuments({
        conversation: isConversation._id,
        sender: { $ne: req.user._id },
        seenAt: null
      });

      const convObject = isConversation.toObject();
      convObject.unreadCount = unreadCount;
      return res.status(200).json(convObject);
    }

    // Create new direct conversation if none exists
    const conversationData = {
      type: 'direct',
      participants: [req.user._id, recipientId]
    };

    const createdConversation = await Conversation.create(conversationData);
    const fullConversation = await Conversation.findOne({ _id: createdConversation._id })
      .populate('participants', 'name username avatar isOnline lastSeen');

    const convObj = fullConversation.toObject();
    convObj.unreadCount = 0;

    res.status(201).json(convObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch all conversations for logged-in user with unread count
// @route   GET /api/conversations
// @access  Private
const fetchConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: { $elemMatch: { $eq: req.user._id } }
    })
      .populate('participants', 'name username avatar isOnline lastSeen')
      .populate('groupAdmin', 'name username avatar')
      .populate({
        path: 'lastMessage',
        select: 'content sender messageType imageUrl deliveredAt seenAt createdAt',
        populate: {
          path: 'sender',
          select: 'name username avatar'
        }
      })
      .sort({ updatedAt: -1 });

    // Calculate unread counts per conversation for current user
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: req.user._id },
          seenAt: null
        });

        const obj = conv.toObject();
        obj.unreadCount = unreadCount;
        return obj;
      })
    );

    res.status(200).json(conversationsWithUnread);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Group Conversation
// @route   POST /api/conversations/group
// @access  Private
const createGroupConversation = async (req, res, next) => {
  try {
    const { groupName, participantIds } = req.body;

    if (!groupName || groupName.trim() === '') {
      res.status(400);
      throw new Error('Group name is required');
    }

    if (!participantIds || !Array.isArray(participantIds)) {
      res.status(400);
      throw new Error('Participant user IDs list is required');
    }

    // Include creator in participants
    const allParticipants = [...participantIds, req.user._id.toString()];
    const uniqueParticipants = Array.from(new Set(allParticipants));

    if (uniqueParticipants.length < 2) {
      res.status(400);
      throw new Error('A group conversation requires at least 2 participants');
    }

    // Verify all participant IDs are valid
    for (const pid of uniqueParticipants) {
      if (!mongoose.Types.ObjectId.isValid(pid)) {
        res.status(400);
        throw new Error(`Invalid user ID format: ${pid}`);
      }
    }

    const existingUsers = await User.find({ _id: { $in: uniqueParticipants } });
    if (existingUsers.length !== uniqueParticipants.length) {
      res.status(400);
      throw new Error('One or more selected participants do not exist');
    }

    const groupConversation = await Conversation.create({
      type: 'group',
      groupName: groupName.trim(),
      groupAdmin: req.user._id,
      groupAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName.trim())}`,
      participants: uniqueParticipants
    });

    const fullGroup = await Conversation.findById(groupConversation._id)
      .populate('participants', 'name username avatar isOnline lastSeen')
      .populate('groupAdmin', 'name username avatar');

    const groupObj = fullGroup.toObject();
    groupObj.unreadCount = 0;

    res.status(201).json(groupObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Rename a Group Conversation (Admin only)
// @route   PUT /api/conversations/group/rename
// @access  Private
const renameGroup = async (req, res, next) => {
  try {
    const { conversationId, groupName } = req.body;

    if (!conversationId || !groupName || groupName.trim() === '') {
      res.status(400);
      throw new Error('Conversation ID and new group name are required');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.type !== 'group') {
      res.status(404);
      throw new Error('Group conversation not found');
    }

    // Verify admin permission
    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the group admin can rename the group');
    }

    conversation.groupName = groupName.trim();
    await conversation.save();

    const updatedGroup = await Conversation.findById(conversation._id)
      .populate('participants', 'name username avatar isOnline lastSeen')
      .populate('groupAdmin', 'name username avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    res.status(200).json(updatedGroup);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a participant to Group Conversation (Admin only)
// @route   PUT /api/conversations/group/add
// @access  Private
const addToGroup = async (req, res, next) => {
  try {
    const { conversationId, userId } = req.body;

    if (!conversationId || !userId) {
      res.status(400);
      throw new Error('Conversation ID and user ID to add are required');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.type !== 'group') {
      res.status(404);
      throw new Error('Group conversation not found');
    }

    // Verify admin permission
    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the group admin can add members');
    }

    // Check target user exists
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      res.status(404);
      throw new Error('User to add not found');
    }

    // Check if user is already a participant
    const alreadyParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (alreadyParticipant) {
      res.status(400);
      throw new Error('User is already a member of this group');
    }

    conversation.participants.push(userId);
    await conversation.save();

    const updatedGroup = await Conversation.findById(conversation._id)
      .populate('participants', 'name username avatar isOnline lastSeen')
      .populate('groupAdmin', 'name username avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    res.status(200).json(updatedGroup);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a participant from Group Conversation (Admin only)
// @route   PUT /api/conversations/group/remove
// @access  Private
const removeFromGroup = async (req, res, next) => {
  try {
    const { conversationId, userId } = req.body;

    if (!conversationId || !userId) {
      res.status(400);
      throw new Error('Conversation ID and user ID to remove are required');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.type !== 'group') {
      res.status(404);
      throw new Error('Group conversation not found');
    }

    // Verify admin permission
    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the group admin can remove members');
    }

    // Prevent admin from removing themselves via member removal endpoint
    if (userId.toString() === conversation.groupAdmin.toString()) {
      res.status(400);
      throw new Error('Group admin cannot remove themselves from the group');
    }

    // Verify user is in participants list
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      res.status(404);
      throw new Error('User is not a member of this group');
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== userId.toString()
    );

    await conversation.save();

    const updatedGroup = await Conversation.findById(conversation._id)
      .populate('participants', 'name username avatar isOnline lastSeen')
      .populate('groupAdmin', 'name username avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name username avatar' }
      });

    res.status(200).json(updatedGroup);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  accessConversation,
  fetchConversations,
  createGroupConversation,
  renameGroup,
  addToGroup,
  removeFromGroup
};
