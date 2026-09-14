const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');

const createMessageService = async ({
  senderId,
  conversationId,
  content = '',
  messageType = 'text',
  imageUrl = null,
  imagePublicId = null,
  audioUrl = null,
  audioDuration = 0,
  replyTo = null,
  isRecipientConnected = false
}) => {
  if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
    const error = new Error('Valid conversation ID is required');
    error.status = 400;
    throw error;
  }

  if (messageType === 'image' || messageType === 'gif' || messageType === 'sticker') {
    if (!imageUrl) {
      const error = new Error('Media URL is required for media messages');
      error.status = 400;
      throw error;
    }
  } else if (messageType === 'audio') {
    const finalAudioUrl = audioUrl || imageUrl;
    if (!finalAudioUrl) {
      const error = new Error('Audio URL is required for voice messages');
      error.status = 400;
      throw error;
    }
    audioUrl = finalAudioUrl;
  } else {
    if (!content || content.trim() === '') {
      const error = new Error('Message content cannot be empty');
      error.status = 400;
      throw error;
    }
    if (content.length > 5000) {
      const error = new Error('Message content cannot exceed 5000 characters');
      error.status = 400;
      throw error;
    }
  }

  // Verify conversation exists
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.status = 404;
    throw error;
  }

  // Verify sender is a participant
  const isParticipant = conversation.participants.some(
    (participantId) => participantId.toString() === senderId.toString()
  );

  if (!isParticipant) {
    const error = new Error('Unauthorized: You are not a participant in this conversation');
    error.status = 403;
    throw error;
  }

  // If direct chat, check if recipient has blocked the sender
  if (conversation.type === 'direct') {
    const recipientId = conversation.participants.find(
      (pId) => pId.toString() !== senderId.toString()
    );
    if (recipientId) {
      const User = require('../models/User');
      const recipientUser = await User.findById(recipientId).select('blockedUsers');
      if (
        recipientUser &&
        recipientUser.blockedUsers &&
        recipientUser.blockedUsers.some((id) => id.toString() === senderId.toString())
      ) {
        const error = new Error('You cannot send messages to this user');
        error.status = 403;
        throw error;
      }
    }
  }

  // Validate replyTo if provided
  let validReplyToId = null;
  if (replyTo) {
    if (!mongoose.Types.ObjectId.isValid(replyTo)) {
      const error = new Error('Invalid replyTo message ID format');
      error.status = 400;
      throw error;
    }
    const targetMsg = await Message.findById(replyTo);
    if (!targetMsg || targetMsg.conversation.toString() !== conversationId.toString()) {
      const error = new Error('Reply target message not found in this conversation');
      error.status = 400;
      throw error;
    }
    validReplyToId = replyTo;
  }

  // Create message record
  let message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    content: content ? content.trim() : '',
    messageType,
    imageUrl,
    imagePublicId,
    audioUrl,
    audioDuration: audioDuration || 0,
    replyTo: validReplyToId,
    deliveredAt: isRecipientConnected ? new Date() : null,
    seenAt: null
  });

  // Update conversation's lastMessage reference & updatedAt timestamp
  conversation.lastMessage = message._id;
  await conversation.save();

  // Populate sender & replyTo details
  message = await Message.findById(message._id)
    .populate('sender', 'name username avatar')
    .populate({
      path: 'replyTo',
      select: 'content messageType imageUrl audioUrl audioDuration sender isDeleted',
      populate: { path: 'sender', select: 'name username avatar' }
    });

  return message;
};

// Edit message (Sender only, Text messages only)
const editMessageService = async ({ messageId, userId, content }) => {
  if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
    const error = new Error('Valid message ID is required');
    error.status = 400;
    throw error;
  }

  if (!content || content.trim() === '') {
    const error = new Error('Updated message content cannot be empty');
    error.status = 400;
    throw error;
  }

  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error('Message not found');
    error.status = 404;
    throw error;
  }

  if (message.sender.toString() !== userId.toString()) {
    const error = new Error('Unauthorized: You can only edit your own messages');
    error.status = 403;
    throw error;
  }

  if (message.isDeleted) {
    const error = new Error('Deleted messages cannot be edited');
    error.status = 400;
    throw error;
  }

  if (message.messageType !== 'text') {
    const error = new Error('Only text messages can be edited');
    error.status = 400;
    throw error;
  }

  message.content = content.trim();
  message.editedAt = new Date();
  await message.save();

  const updated = await Message.findById(message._id)
    .populate('sender', 'name username avatar')
    .populate({
      path: 'replyTo',
      select: 'content messageType imageUrl audioUrl audioDuration sender isDeleted',
      populate: { path: 'sender', select: 'name username avatar' }
    })
    .populate('reactions.user', 'name username avatar');

  return updated;
};

// Delete message (Soft delete for everyone, Sender only)
const deleteMessageService = async ({ messageId, userId }) => {
  if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
    const error = new Error('Valid message ID is required');
    error.status = 400;
    throw error;
  }

  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error('Message not found');
    error.status = 404;
    throw error;
  }

  if (message.sender.toString() !== userId.toString()) {
    const error = new Error('Unauthorized: You can only delete your own messages');
    error.status = 403;
    throw error;
  }

  message.isDeleted = true;
  message.content = '';
  message.imageUrl = null;
  message.imagePublicId = null;
  message.reactions = [];
  await message.save();

  const deleted = await Message.findById(message._id)
    .populate('sender', 'name username avatar')
    .populate({
      path: 'replyTo',
      select: 'content messageType imageUrl audioUrl audioDuration sender isDeleted',
      populate: { path: 'sender', select: 'name username avatar' }
    });

  return deleted;
};

// Toggle Emoji Reaction on Message
const reactMessageService = async ({ messageId, userId, emoji }) => {
  const allowedEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  if (!allowedEmojis.includes(emoji)) {
    const error = new Error('Invalid emoji reaction');
    error.status = 400;
    throw error;
  }

  const message = await Message.findById(messageId);
  if (!message || message.isDeleted) {
    const error = new Error('Message not found or has been deleted');
    error.status = 404;
    throw error;
  }

  // Verify user is participant in conversation
  const conversation = await Conversation.findById(message.conversation);
  const isParticipant = conversation?.participants.some(
    (p) => p.toString() === userId.toString()
  );

  if (!isParticipant) {
    const error = new Error('Unauthorized: You are not a participant in this conversation');
    error.status = 403;
    throw error;
  }

  // Find existing reaction from current user
  const existingReactionIndex = message.reactions.findIndex(
    (r) => r.user.toString() === userId.toString()
  );

  if (existingReactionIndex > -1) {
    if (message.reactions[existingReactionIndex].emoji === emoji) {
      // Toggle off if same emoji clicked again
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Update emoji if different
      message.reactions[existingReactionIndex].emoji = emoji;
    }
  } else {
    // Add new reaction
    message.reactions.push({ user: userId, emoji });
  }

  await message.save();

  const updated = await Message.findById(message._id)
    .populate('sender', 'name username avatar')
    .populate('reactions.user', 'name username avatar')
    .populate({
      path: 'replyTo',
      select: 'content messageType imageUrl audioUrl audioDuration sender isDeleted',
      populate: { path: 'sender', select: 'name username avatar' }
    });

  return updated;
};

// Search messages across conversations of authenticated user
const searchMessagesService = async ({ userId, query }) => {
  if (!query || query.trim() === '') {
    return [];
  }

  const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 1. Get all conversation IDs that current user belongs to
  const userConversations = await Conversation.find({
    participants: { $elemMatch: { $eq: userId } }
  }).select('_id type groupName groupAvatar participants');

  if (!userConversations || userConversations.length === 0) {
    return [];
  }

  const convIds = userConversations.map((c) => c._id);

  // 2. Search non-deleted text messages matching the query
  const messages = await Message.find({
    conversation: { $in: convIds },
    isDeleted: false,
    content: { $regex: escapedQuery, $options: 'i' }
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('sender', 'name username avatar')
    .populate({
      path: 'conversation',
      select: 'type groupName groupAvatar participants',
      populate: {
        path: 'participants',
        select: 'name username avatar'
      }
    });

  return messages;
};

module.exports = {
  createMessageService,
  editMessageService,
  deleteMessageService,
  reactMessageService,
  searchMessagesService
};
