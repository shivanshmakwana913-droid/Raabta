const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const {
  createMessageService,
  editMessageService,
  deleteMessageService,
  reactMessageService
} = require('../services/messageService');

// In-memory user connection tracking: userIdString -> Set(socketIds)
const userSocketsMap = new Map();

const initSocketServer = (io) => {
  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization &&
          socket.handshake.headers.authorization.startsWith('Bearer')
          ? socket.handshake.headers.authorization.split(' ')[1]
          : null);

      if (!token) {
        return next(new Error('Authentication failed: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication failed: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('[Socket Auth Error]:', error.message);
      return next(new Error('Authentication failed: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userIdStr = socket.user._id.toString();
    console.log(`[Socket Connected] User: ${socket.user.username} (${socket.id})`);

    // Track active connection
    if (!userSocketsMap.has(userIdStr)) {
      userSocketsMap.set(userIdStr, new Set());
    }
    userSocketsMap.get(userIdStr).add(socket.id);

    // Mark user online if first connection
    if (userSocketsMap.get(userIdStr).size === 1) {
      try {
        await User.findByIdAndUpdate(socket.user._id, { isOnline: true });
        io.emit('user_online', {
          userId: socket.user._id,
          username: socket.user.username
        });

        // Mark pending undelivered messages sent to this user as delivered
        const userConvs = await Conversation.find({
          participants: { $elemMatch: { $eq: socket.user._id } }
        }).select('_id');

        const convIds = userConvs.map((c) => c._id);
        const now = new Date();

        await Message.updateMany(
          {
            conversation: { $in: convIds },
            sender: { $ne: socket.user._id },
            deliveredAt: null
          },
          {
            $set: { deliveredAt: now }
          }
        );
      } catch (err) {
        console.error('[Socket User Online Error]:', err.message);
      }
    }

    // Join Conversation Room
    socket.on('join_conversation', async (data, callback) => {
      try {
        const { conversationId } = data || {};
        if (!conversationId) {
          if (callback) callback({ status: 'error', message: 'Conversation ID required' });
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          if (callback) callback({ status: 'error', message: 'Conversation not found' });
          return;
        }

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.user._id.toString()
        );

        if (!isParticipant) {
          if (callback) callback({ status: 'error', message: 'Unauthorized room access' });
          return;
        }

        socket.join(conversationId);
        if (callback) callback({ status: 'ok', room: conversationId });
      } catch (err) {
        console.error('[Socket join_conversation error]:', err.message);
        if (callback) callback({ status: 'error', message: err.message });
      }
    });

    // Leave Conversation Room
    socket.on('leave_conversation', (data, callback) => {
      try {
        const { conversationId } = data || {};
        if (conversationId) {
          socket.leave(conversationId);
        }
        if (callback) callback({ status: 'ok', room: conversationId });
      } catch (err) {
        if (callback) callback({ status: 'error', message: err.message });
      }
    });

    // Real-Time Send Message (Supports text, image & replyTo)
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, content, messageType, imageUrl, imagePublicId, replyTo } = data || {};

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          if (callback) callback({ status: 'error', message: 'Conversation not found' });
          return;
        }

        const otherParticipantId = conversation.participants.find(
          (p) => p.toString() !== socket.user._id.toString()
        );

        const isRecipientConnected = otherParticipantId
          ? userSocketsMap.has(otherParticipantId.toString())
          : false;

        const message = await createMessageService({
          senderId: socket.user._id,
          conversationId,
          content,
          messageType,
          imageUrl,
          imagePublicId,
          replyTo,
          isRecipientConnected
        });

        // Broadcast message to room
        io.to(conversationId).emit('new_message', message);

        if (callback) callback({ status: 'ok', data: message });
      } catch (err) {
        console.error('[Socket send_message error]:', err.message);
        if (callback) callback({ status: 'error', message: err.message });
        socket.emit('socket_error', { message: err.message });
      }
    });

    // Real-Time Edit Message
    socket.on('edit_message', async (data, callback) => {
      try {
        const { messageId, content } = data || {};
        const updatedMessage = await editMessageService({
          messageId,
          userId: socket.user._id,
          content
        });

        io.to(updatedMessage.conversation.toString()).emit('message_updated', updatedMessage);
        if (callback) callback({ status: 'ok', data: updatedMessage });
      } catch (err) {
        console.error('[Socket edit_message error]:', err.message);
        if (callback) callback({ status: 'error', message: err.message });
      }
    });

    // Real-Time Delete Message
    socket.on('delete_message', async (data, callback) => {
      try {
        const { messageId } = data || {};
        const deletedMessage = await deleteMessageService({
          messageId,
          userId: socket.user._id
        });

        io.to(deletedMessage.conversation.toString()).emit('message_deleted', deletedMessage);
        if (callback) callback({ status: 'ok', data: deletedMessage });
      } catch (err) {
        console.error('[Socket delete_message error]:', err.message);
        if (callback) callback({ status: 'error', message: err.message });
      }
    });

    // Real-Time Reaction to Message
    socket.on('react_to_message', async (data, callback) => {
      try {
        const { messageId, emoji } = data || {};
        const reactedMessage = await reactMessageService({
          messageId,
          userId: socket.user._id,
          emoji
        });

        io.to(reactedMessage.conversation.toString()).emit('message_reaction_updated', reactedMessage);
        if (callback) callback({ status: 'ok', data: reactedMessage });
      } catch (err) {
        console.error('[Socket react_to_message error]:', err.message);
        if (callback) callback({ status: 'error', message: err.message });
      }
    });

    // Mark Messages as Seen
    socket.on('mark_messages_seen', async (data, callback) => {
      try {
        const { conversationId } = data || {};
        if (!conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.user._id.toString()
        );
        if (!isParticipant) return;

        const now = new Date();
        await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: socket.user._id },
            seenAt: null
          },
          {
            $set: { seenAt: now, deliveredAt: now }
          }
        );

        io.to(conversationId).emit('messages_seen', {
          conversationId,
          seenBy: socket.user._id,
          seenAt: now
        });

        if (callback) callback({ status: 'ok', seenAt: now });
      } catch (err) {
        console.error('[Socket mark_messages_seen error]:', err.message);
      }
    });

    // Typing Indicators
    socket.on('typing_start', (data) => {
      const { conversationId } = data || {};
      if (conversationId) {
        socket.to(conversationId).emit('user_typing', {
          conversationId,
          userId: socket.user._id,
          username: socket.user.username
        });
      }
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data || {};
      if (conversationId) {
        socket.to(conversationId).emit('user_stopped_typing', {
          conversationId,
          userId: socket.user._id
        });
      }
    });

    // Disconnect Handler
    socket.on('disconnect', async () => {
      console.log(`[Socket Disconnected] User: ${socket.user.username} (${socket.id})`);

      if (userSocketsMap.has(userIdStr)) {
        const userSet = userSocketsMap.get(userIdStr);
        userSet.delete(socket.id);

        if (userSet.size === 0) {
          userSocketsMap.delete(userIdStr);
          const lastSeen = new Date();
          try {
            await User.findByIdAndUpdate(socket.user._id, {
              isOnline: false,
              lastSeen
            });
            io.emit('user_offline', {
              userId: socket.user._id,
              lastSeen
            });
          } catch (err) {
            console.error('[Socket User Offline Error]:', err.message);
          }
        }
      }
    });
  });
};

module.exports = initSocketServer;
