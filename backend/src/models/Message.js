const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      trim: true,
      default: ''
    },
    messageType: {
      type: String,
      enum: ['text', 'image'],
      default: 'text'
    },
    imageUrl: {
      type: String,
      default: null
    },
    imagePublicId: {
      type: String,
      default: null
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        emoji: {
          type: String,
          required: true
        }
      }
    ],
    editedAt: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    seenAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for fast message history, search & unread count queries
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, sender: 1, seenAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
