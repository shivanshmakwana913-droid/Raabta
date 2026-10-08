const mongoose = require('mongoose');

const decisionSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    proposer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    confirmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true
    },
    decisionText: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['proposed', 'confirmed', 'rejected'],
      default: 'proposed'
    },
    confirmedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

decisionSchema.index({ conversation: 1, status: 1, createdAt: -1 });

const Decision = mongoose.model('Decision', decisionSchema);

module.exports = Decision;
