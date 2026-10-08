const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Plan = require('../models/Plan');
const {
  createMessageService,
  editMessageService,
  deleteMessageService,
  reactMessageService
} = require('../services/messageService');

// In-memory user connection tracking: userIdString -> Set(socketIds)
const userSocketsMap = new Map();
// In-memory active call tracking: callId -> callData
const activeCallsMap = new Map();

const initSocketServer = (io) => {
  // Helper to log system call history messages
  const saveCallHistoryMessage = async ({ conversationId, senderId, callType, callStatus, callDuration }) => {
    try {
      let content = '';
      const isVideo = callType === 'video';
      if (callStatus === 'ended') {
        const minutes = Math.floor((callDuration || 0) / 60);
        const seconds = (callDuration || 0) % 60;
        const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        content = `${isVideo ? 'Video' : 'Audio'} call • ${durationStr}`;
      } else if (callStatus === 'missed') {
        content = `Missed ${isVideo ? 'video' : 'audio'} call`;
      } else if (callStatus === 'declined') {
        content = `${isVideo ? 'Video' : 'Audio'} call declined`;
      } else if (callStatus === 'busy') {
        content = `${isVideo ? 'Video' : 'Audio'} call • Line busy`;
      } else {
        content = `${isVideo ? 'Video' : 'Audio'} call`;
      }

      const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        content,
        messageType: 'call',
        callType,
        callStatus,
        callDuration: callDuration || 0,
        deliveredAt: new Date(),
        seenAt: null
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: new Date()
      });

      const populatedMsg = await Message.findById(message._id).populate('sender', 'name username avatar');
      io.to(conversationId.toString()).emit('receive_message', populatedMsg);

      // Broadcast directly to all participants so active sockets and conversation list update in real time
      const conv = await Conversation.findById(conversationId).select('participants');
      if (conv && conv.participants) {
        conv.participants.forEach((pId) => {
          sendToUser(pId.toString(), 'receive_message', populatedMsg);
        });
      }

      return populatedMsg;
    } catch (err) {
      console.error('[Save Call History Error]:', err.message);
    }
  };

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

    // Helper to send socket event to a specific user's connected socket(s)
    const sendToUser = (targetUserIdStr, eventName, payload) => {
      const targetSockets = userSocketsMap.get(targetUserIdStr.toString());
      if (targetSockets) {
        targetSockets.forEach((sockId) => {
          io.to(sockId).emit(eventName, payload);
        });
        return true;
      }
      return false;
    };

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

    // Real-Time Send Message (Supports text, image, gif, sticker & audio)
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, content, messageType, imageUrl, imagePublicId, audioUrl, audioDuration, replyTo } = data || {};

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
          audioUrl,
          audioDuration,
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

    // Real-Time Update Message Category
    socket.on('update_message_category', async (data, callback) => {
      try {
        const { messageId, category } = data || {};
        const allowedCategories = ['important', 'task', 'payment', 'event', 'study', null];
        if (category !== null && !allowedCategories.includes(category)) {
          if (callback) callback({ status: 'error', message: 'Invalid category' });
          return;
        }

        const msg = await Message.findById(messageId);
        if (!msg || msg.isDeleted) {
          if (callback) callback({ status: 'error', message: 'Message not found' });
          return;
        }

        msg.category = category;
        await msg.save();

        const updatedMessage = await Message.findById(msg._id)
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

        io.to(updatedMessage.conversation.toString()).emit('message_updated', updatedMessage);
        if (callback) callback({ status: 'ok', data: updatedMessage });
      } catch (err) {
        console.error('[Socket update_message_category error]:', err.message);
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

    // ==========================================
    // 📞 WEBRTC AUDIO & VIDEO CALL SIGNALING
    // ==========================================

    // Initiate Call (call:initiate)
    socket.on('call:initiate', async (data, callback) => {
      try {
        const { conversationId, targetUserId, callType } = data || {};
        const callerUserIdStr = socket.user._id.toString();

        if (!conversationId || !targetUserId || !callType) {
          if (callback) callback({ status: 'error', message: 'Missing call parameter fields' });
          return;
        }

        // Check if caller is already in an active call
        for (const call of activeCallsMap.values()) {
          if (call.callerId === callerUserIdStr || call.targetUserId === callerUserIdStr) {
            if (callback) callback({ status: 'error', message: 'You are already in an active call' });
            return;
          }
        }

        // Check if target user is in another call
        const targetUserIdStr = targetUserId.toString();
        for (const call of activeCallsMap.values()) {
          if (call.callerId === targetUserIdStr || call.targetUserId === targetUserIdStr) {
            sendToUser(callerUserIdStr, 'call:busy', { conversationId, targetUserId: targetUserIdStr });
            await saveCallHistoryMessage({
              conversationId,
              senderId: socket.user._id,
              callType,
              callStatus: 'busy'
            });
            if (callback) callback({ status: 'busy', message: 'User is in another call' });
            return;
          }
        }

        // Verify conversation validity
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.some((p) => p.toString() === targetUserIdStr)) {
          if (callback) callback({ status: 'error', message: 'Invalid target conversation or user' });
          return;
        }

        const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const callData = {
          callId,
          conversationId: conversationId.toString(),
          callerId: callerUserIdStr,
          targetUserId: targetUserIdStr,
          callType, // 'audio' | 'video'
          status: 'calling', // 'calling' | 'ringing' | 'connected'
          startedAt: Date.now(),
          connectedAt: null
        };

        activeCallsMap.set(callId, callData);

        // Notify target user socket(s)
        const isOnlineAndNotified = sendToUser(targetUserIdStr, 'call:incoming', {
          callId,
          conversationId: conversationId.toString(),
          caller: {
            _id: socket.user._id,
            name: socket.user.name,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          callType
        });

        if (!isOnlineAndNotified) {
          // Target user is offline
          activeCallsMap.delete(callId);
          await saveCallHistoryMessage({
            conversationId,
            senderId: socket.user._id,
            callType,
            callStatus: 'missed'
          });
          if (callback) callback({ status: 'offline', message: 'User is currently offline' });
          return;
        }

        if (callback) callback({ status: 'ok', callId });
      } catch (err) {
        console.error('[Call Initiate Error]:', err.message);
        if (callback) callback({ status: 'error', message: err.message });
      }
    });

    // Accept Call (call:accept)
    socket.on('call:accept', (data, callback) => {
      const { callId } = data || {};
      const call = activeCallsMap.get(callId);

      if (!call) {
        if (callback) callback({ status: 'error', message: 'Call no longer active' });
        return;
      }

      call.status = 'connected';
      call.connectedAt = Date.now();

      sendToUser(call.callerId, 'call:accepted', {
        callId,
        acceptedBy: socket.user._id
      });

      if (callback) callback({ status: 'ok' });
    });

    // Decline Call (call:decline)
    socket.on('call:decline', async (data) => {
      const { callId, reason } = data || {};
      const call = activeCallsMap.get(callId);

      if (call) {
        sendToUser(call.callerId, 'call:declined', {
          callId,
          reason: reason || 'declined'
        });

        activeCallsMap.delete(callId);

        await saveCallHistoryMessage({
          conversationId: call.conversationId,
          senderId: socket.user._id,
          callType: call.callType,
          callStatus: 'declined'
        });
      }
    });

    // WebRTC Offer (call:offer)
    socket.on('call:offer', (data) => {
      const { callId, targetUserId, sdp } = data || {};
      if (targetUserId && sdp) {
        sendToUser(targetUserId, 'call:offer', {
          callId,
          callerUserId: socket.user._id,
          sdp
        });
      }
    });

    // WebRTC Answer (call:answer)
    socket.on('call:answer', (data) => {
      const { callId, targetUserId, sdp } = data || {};
      if (targetUserId && sdp) {
        sendToUser(targetUserId, 'call:answer', {
          callId,
          answerUserId: socket.user._id,
          sdp
        });
      }
    });

    // WebRTC ICE Candidate (call:ice-candidate)
    socket.on('call:ice-candidate', (data) => {
      const { callId, targetUserId, candidate } = data || {};
      if (targetUserId && candidate) {
        sendToUser(targetUserId, 'call:ice-candidate', {
          callId,
          senderUserId: socket.user._id,
          candidate
        });
      }
    });

    // End Call (call:end)
    socket.on('call:end', async (data) => {
      const { callId, reason } = data || {};
      const call = activeCallsMap.get(callId);

      if (call) {
        const peerUserId = call.callerId === userIdStr ? call.targetUserId : call.callerId;
        const duration = call.connectedAt ? Math.floor((Date.now() - call.connectedAt) / 1000) : 0;
        const finalStatus = duration > 0 ? 'ended' : (call.status === 'calling' ? 'missed' : 'ended');

        sendToUser(peerUserId, 'call:ended', {
          callId,
          reason: reason || 'ended',
          duration
        });

        activeCallsMap.delete(callId);

        await saveCallHistoryMessage({
          conversationId: call.conversationId,
          senderId: socket.user._id,
          callType: call.callType,
          callStatus: finalStatus,
          callDuration: duration
        });
      }
    });

    // Socket Event: Real-Time Plan Creation
    socket.on('create_plan', async (data, callback) => {
      try {
        const { conversationId, title, date } = data || {};
        if (!title || !title.trim()) {
          if (callback) callback({ status: 'error', message: 'Plan title is required' });
          return;
        }
        if (!date || isNaN(new Date(date).getTime())) {
          if (callback) callback({ status: 'error', message: 'Valid plan date is required' });
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

        const plan = await Plan.create({
          conversation: conversationId,
          creator: socket.user._id,
          title: title.trim(),
          date: new Date(date),
          responses: [{ user: socket.user._id, status: 'going' }]
        });

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.user._id,
          content: title.trim(),
          messageType: 'plan',
          plan: plan._id,
          deliveredAt: new Date()
        });

        await Conversation.findByIdAndUpdate(conversationId, {
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

        io.to(conversationId).emit('new_message', populatedMessage);
        io.to(conversationId).emit('plan_created', populatedPlan);

        if (callback) callback({ status: 'ok', data: { plan: populatedPlan, message: populatedMessage } });
      } catch (err) {
        console.error('[Socket create_plan error]:', err.message);
        if (callback) callback({ status: 'error', message: err.message });
      }
    });

    // Socket Event: Real-Time Plan Response
    socket.on('respond_plan', async (data, callback) => {
      try {
        const { planId, status } = data || {};
        const validStatuses = ['going', 'maybe', 'cant_go'];
        if (!status || !validStatuses.includes(status)) {
          if (callback) callback({ status: 'error', message: 'Invalid response status' });
          return;
        }
        const plan = await Plan.findById(planId);
        if (!plan) {
          if (callback) callback({ status: 'error', message: 'Plan not found' });
          return;
        }
        const conversation = await Conversation.findById(plan.conversation);
        if (!conversation) {
          if (callback) callback({ status: 'error', message: 'Conversation not found' });
          return;
        }
        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.user._id.toString()
        );
        if (!isParticipant) {
          if (callback) callback({ status: 'error', message: 'Unauthorized plan access' });
          return;
        }

        const existingIndex = plan.responses.findIndex(
          (r) => r.user.toString() === socket.user._id.toString()
        );
        if (existingIndex > -1) {
          plan.responses[existingIndex].status = status;
        } else {
          plan.responses.push({ user: socket.user._id, status });
        }
        await plan.save();

        const populatedPlan = await Plan.findById(plan._id)
          .populate('creator', 'name username avatar')
          .populate('responses.user', 'name username avatar');

        io.to(plan.conversation.toString()).emit('plan_updated', populatedPlan);

        if (callback) callback({ status: 'ok', data: populatedPlan });
      } catch (err) {
        console.error('[Socket respond_plan error]:', err.message);
        if (callback) callback({ status: 'error', message: err.message });
      }
    });

    // Disconnect Handler
    socket.on('disconnect', async () => {
      console.log(`[Socket Disconnected] User: ${socket.user.username} (${socket.id})`);

      // Check if user was in an active call on disconnect
      for (const [callId, call] of activeCallsMap.entries()) {
        if (call.callerId === userIdStr || call.targetUserId === userIdStr) {
          const peerUserId = call.callerId === userIdStr ? call.targetUserId : call.callerId;
          const duration = call.connectedAt ? Math.floor((Date.now() - call.connectedAt) / 1000) : 0;
          const finalStatus = duration > 0 ? 'ended' : 'missed';

          sendToUser(peerUserId, 'call:ended', {
            callId,
            reason: 'disconnected',
            duration
          });

          activeCallsMap.delete(callId);

          saveCallHistoryMessage({
            conversationId: call.conversationId,
            senderId: socket.user._id,
            callType: call.callType,
            callStatus: finalStatus,
            callDuration: duration
          });
        }
      }

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
