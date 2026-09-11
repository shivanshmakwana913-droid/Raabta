const Report = require('../models/Report');
const User = require('../models/User');
const Message = require('../models/Message');

// @desc    Create a new report for a user or message
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res, next) => {
  try {
    const { reportedUserId, messageId, reason, details } = req.body;

    if (!reportedUserId || !reason) {
      res.status(400);
      throw new Error('Reported user ID and reason are required');
    }

    const allowedReasons = ['Spam', 'Harassment', 'Abuse', 'Inappropriate content', 'Other'];
    if (!allowedReasons.includes(reason)) {
      res.status(400);
      throw new Error('Invalid report reason');
    }

    // Verify reported user exists
    const targetUser = await User.findById(reportedUserId);
    if (!targetUser) {
      res.status(404);
      throw new Error('Reported user not found');
    }

    // Optional message check
    let validMessageId = null;
    if (messageId) {
      const msg = await Message.findById(messageId);
      if (msg) {
        validMessageId = msg._id;
      }
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedUser: reportedUserId,
      message: validMessageId,
      reason,
      details: details ? details.trim().substring(0, 500) : '',
      status: 'pending'
    });

    res.status(201).json({
      message: 'Report submitted successfully. Our team will review it shortly.',
      reportId: report._id
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReport };
