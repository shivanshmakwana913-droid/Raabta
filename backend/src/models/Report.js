const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    reason: {
      type: String,
      required: [true, 'Report reason is required'],
      enum: ['Spam', 'Harassment', 'Abuse', 'Inappropriate content', 'Other']
    },
    details: {
      type: String,
      default: '',
      maxlength: [500, 'Details cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

reportSchema.index({ reporter: 1, reportedUser: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
