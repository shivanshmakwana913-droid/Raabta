const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct'
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    groupName: {
      type: String,
      default: ''
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    groupAvatar: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Index for fast participant conversation list lookup
conversationSchema.index({ participants: 1, updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
