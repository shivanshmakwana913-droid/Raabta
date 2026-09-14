const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const {
  createMessageService,
  editMessageService,
  deleteMessageService,
  reactMessageService,
  searchMessagesService
} = require('../services/messageService');
const { uploadToCloudinary, uploadAudioToCloudinary } = require('../config/cloudinary');
const mongoose = require('mongoose');

// @desc    Send a new message via REST (text, image, gif, sticker, or audio with optional replyTo)
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, content, messageType, imageUrl, imagePublicId, audioUrl, audioDuration, replyTo } = req.body;

    const message = await createMessageService({
      senderId: req.user._id,
      conversationId,
      content,
      messageType,
      imageUrl,
      imagePublicId,
      audioUrl,
      audioDuration,
      replyTo
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a message (Text only, Sender only)
// @route   PUT /api/messages/:id
// @access  Private
const editMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const message = await editMessageService({
      messageId: id,
      userId: req.user._id,
      content
    });

    res.status(200).json(message);
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete a message for everyone (Sender only)
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const message = await deleteMessageService({
      messageId: id,
      userId: req.user._id
    });

    res.status(200).json(message);
  } catch (error) {
    next(error);
  }
};

// @desc    React or toggle reaction on a message
// @route   POST /api/messages/:id/react
// @access  Private
const reactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    const message = await reactMessageService({
      messageId: id,
      userId: req.user._id,
      emoji
    });

    res.status(200).json(message);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload image to Cloudinary
// @route   POST /api/messages/upload
// @access  Private
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please provide a valid image file');
    }

    const uploadResult = await uploadToCloudinary(req.file.buffer, 'chat_uploads');

    res.status(200).json({
      status: 'ok',
      url: uploadResult.url,
      publicId: uploadResult.publicId
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload voice message audio to Cloudinary
// @route   POST /api/messages/upload-audio
// @access  Private
const uploadAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please provide a valid audio recording file');
    }

    const uploadResult = await uploadAudioToCloudinary(req.file.buffer, 'chat_voice_messages');

    res.status(200).json({
      status: 'ok',
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      duration: uploadResult.duration || 0
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get paginated messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400);
      throw new Error('Invalid conversation ID format');
    }

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404);
      throw new Error('Conversation not found');
    }

    // Verify authenticated user is a participant
    const isParticipant = conversation.participants.some(
      (participantId) => participantId.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      res.status(403);
      throw new Error('Unauthorized: You are not a participant in this conversation');
    }

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 30;
    if (limit > 100) limit = 100;

    const total = await Message.countDocuments({ conversation: conversationId });
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name username avatar')
      .populate({
        path: 'replyTo',
        select: 'content messageType imageUrl audioUrl audioDuration sender isDeleted',
        populate: { path: 'sender', select: 'name username avatar' }
      })
      .populate('reactions.user', 'name username avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark unread messages in a conversation as seen
// @route   POST /api/messages/mark-seen
// @access  Private
const markMessagesSeen = async (req, res, next) => {
  try {
    const { conversationId } = req.body;

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

    const now = new Date();
    const result = await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        seenAt: null
      },
      {
        $set: { seenAt: now, deliveredAt: now }
      }
    );

    res.status(200).json({
      status: 'ok',
      markedCount: result.modifiedCount,
      seenAt: now
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search text messages across user's accessible conversations
// @route   GET /api/messages/search?q=query
// @access  Private
const searchMessages = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(200).json({ messages: [] });
    }

    const messages = await searchMessagesService({
      userId: req.user._id,
      query: q
    });

    res.status(200).json({ messages });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  editMessage,
  deleteMessage,
  reactMessage,
  uploadImage,
  uploadAudio,
  getMessages,
  markMessagesSeen,
  searchMessages
};
