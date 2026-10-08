const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    actionType: {
      type: String,
      enum: ['task', 'reminder', 'plan'],
      default: 'task'
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    note: {
      type: String,
      trim: true,
      default: ''
    },
    dueDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

followUpSchema.index({ conversation: 1, status: 1, createdAt: -1 });
followUpSchema.index({ user: 1, conversation: 1, status: 1 });

const FollowUp = mongoose.model('FollowUp', followUpSchema);

module.exports = FollowUp;
