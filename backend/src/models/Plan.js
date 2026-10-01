const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: Date,
      required: true
    },
    responses: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        status: {
          type: String,
          enum: ['going', 'maybe', 'cant_go'],
          required: true
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

planSchema.index({ conversation: 1, createdAt: -1 });

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
