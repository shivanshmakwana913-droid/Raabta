const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Plan = require('../models/Plan');
const FollowUp = require('../models/FollowUp');
const Decision = require('../models/Decision');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

// @desc    Get aggregate system & chat statistics
// @route   GET /api/admin/stats
// @access  Private (Admin Only)
const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      onlineUsers,
      suspendedUsers,
      adminUsers,
      totalMessages,
      totalConversations,
      totalGroups,
      totalPlans,
      totalTasks,
      totalDecisions,
      totalFollowUps
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({ isOnline: true, isDeleted: { $ne: true } }),
      User.countDocuments({ status: { $in: ['suspended', 'banned'] }, isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'admin', isDeleted: { $ne: true } }),
      Message.countDocuments({ isDeleted: { $ne: true } }),
      Conversation.countDocuments(),
      Conversation.countDocuments({ isGroup: true }),
      Plan.countDocuments(),
      FollowUp.countDocuments({ actionType: 'task' }),
      Decision.countDocuments(),
      FollowUp.countDocuments()
    ]);

    const memUsage = process.memoryUsage();
    const systemHealth = {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      dbConnected: mongoose.connection.readyState === 1,
      memory: {
        rssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
        heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2)
      },
      nodeVersion: process.version
    };

    res.status(200).json({
      users: {
        total: totalUsers,
        online: onlineUsers,
        suspended: suspendedUsers,
        admins: adminUsers
      },
      content: {
        messages: totalMessages,
        conversations: totalConversations,
        groups: totalGroups
      },
      intelligence: {
        plans: totalPlans,
        tasks: totalTasks,
        decisions: totalDecisions,
        followUps: totalFollowUps
      },
      health: systemHealth
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get paginated user list with status & role details
// @route   GET /api/admin/users
// @access  Private (Admin Only)
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search ? req.query.search.trim() : '';
    const statusFilter = req.query.status || '';

    const query = { isDeleted: { $ne: true } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (statusFilter) {
      query.status = statusFilter;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('name username email avatar role status isOnline lastSeen createdAt phoneNumberVerified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user account status (active, suspended, banned)
// @route   PUT /api/admin/users/:userId/status
// @access  Private (Admin Only)
const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status option');
    }

    if (!reason || !reason.trim()) {
      res.status(400);
      throw new Error('A valid reason is required for administrative audit tracking');
    }

    if (req.user._id.toString() === userId && status !== 'active') {
      res.status(400);
      throw new Error('Admin cannot suspend or ban their own account');
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404);
      throw new Error('User not found');
    }

    const previousStatus = targetUser.status;
    targetUser.status = status;
    await targetUser.save();

    // Create Audit Log
    await AuditLog.create({
      adminId: req.user._id,
      adminUsername: req.user.username,
      action: status === 'active' ? 'UNSUSPEND_USER' : 'SUSPEND_USER',
      targetId: targetUser._id.toString(),
      targetType: 'User',
      reason: reason.trim(),
      details: { targetUsername: targetUser.username, previousStatus, newStatus: status },
      ipAddress: req.ip || ''
    });

    res.status(200).json({
      message: `User status updated to ${status}`,
      user: targetUser.toAuthJSON()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote or demote user role (user, admin)
// @route   PUT /api/admin/users/:userId/role
// @access  Private (Admin Only)
const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role, reason } = req.body;

    if (!['user', 'admin'].includes(role)) {
      res.status(400);
      throw new Error('Invalid role option');
    }

    if (!reason || !reason.trim()) {
      res.status(400);
      throw new Error('A valid reason is required for administrative audit tracking');
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404);
      throw new Error('User not found');
    }

    if (req.user._id.toString() === userId && role === 'user') {
      const adminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      if (adminCount <= 1) {
        res.status(400);
        throw new Error('Cannot demote the only remaining active admin');
      }
    }

    const previousRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    // Create Audit Log
    await AuditLog.create({
      adminId: req.user._id,
      adminUsername: req.user.username,
      action: role === 'admin' ? 'PROMOTE_TO_ADMIN' : 'DEMOTE_FROM_ADMIN',
      targetId: targetUser._id.toString(),
      targetType: 'User',
      reason: reason.trim(),
      details: { targetUsername: targetUser.username, previousRole, newRole: role },
      ipAddress: req.ip || ''
    });

    res.status(200).json({
      message: `User role updated to ${role}`,
      user: targetUser.toAuthJSON()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get group conversations list
// @route   GET /api/admin/groups
// @access  Private (Admin Only)
const getGroups = async (req, res, next) => {
  try {
    const groups = await Conversation.find({ isGroup: true })
      .populate('participants', 'name username avatar isOnline')
      .populate('groupAdmin', 'name username')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.status(200).json({ groups });
  } catch (error) {
    next(error);
  }
};

// @desc    Get administrative audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin Only)
const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments()
    ]);

    res.status(200).json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed System Health & Metrics
// @route   GET /api/admin/health
// @access  Private (Admin Only)
const getSystemHealth = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const activeSocketCount = io ? io.sockets.sockets.size : 0;
    const mem = process.memoryUsage();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date(),
      uptimeSeconds: Math.floor(process.uptime()),
      dbState: mongoose.connection.states[mongoose.connection.readyState],
      activeSockets: activeSocketCount,
      memory: {
        rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Audited & Disclosed Compliance Inspection of Conversation Metadata
// @route   POST /api/admin/conversations/:conversationId/inspect-request
// @access  Private (Admin Only)
const requestConversationInspection = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { reason, caseId } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400);
      throw new Error('Explicit justification reason is required for private data compliance inspection');
    }

    const conversation = await Conversation.findById(conversationId).populate('participants', 'name username');
    if (!conversation) {
      res.status(404);
      throw new Error('Conversation not found');
    }

    // Create Audit Log with EXPLICIT Privacy Disclosure
    const audit = await AuditLog.create({
      adminId: req.user._id,
      adminUsername: req.user.username,
      action: 'CONVERSATION_INSPECT_REQUEST',
      targetId: conversationId,
      targetType: 'Conversation',
      reason: reason.trim(),
      details: {
        caseId: caseId || 'COMPLIANCE-REF',
        participantCount: conversation.participants.length,
        isGroup: Boolean(conversation.isGroup)
      },
      ipAddress: req.ip || ''
    });

    // Notify chat participants via Socket.IO for complete transparency
    const io = req.app.get('io');
    if (io) {
      io.to(conversationId.toString()).emit('admin_inspection_disclosed', {
        conversationId,
        adminUsername: req.user.username,
        reason: reason.trim(),
        timestamp: audit.createdAt
      });
    }

    const messageCount = await Message.countDocuments({ conversation: conversationId });

    res.status(200).json({
      message: 'Compliance inspection logged and disclosed to conversation participants',
      auditId: audit._id,
      conversationSummary: {
        id: conversation._id,
        isGroup: conversation.isGroup,
        groupTitle: conversation.groupTitle || null,
        messageCount,
        participants: conversation.participants.map(p => p.username),
        createdAt: conversation.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getUsers,
  updateUserStatus,
  updateUserRole,
  getGroups,
  getAuditLogs,
  getSystemHealth,
  requestConversationInspection
};
