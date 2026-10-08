const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    adminUsername: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true // e.g. 'USER_STATUS_CHANGE', 'USER_ROLE_CHANGE', 'GROUP_MODERATE', 'CONVERSATION_INSPECT_REQUEST'
    },
    targetId: {
      type: String,
      default: ''
    },
    targetType: {
      type: String,
      enum: ['User', 'Group', 'Conversation', 'System'],
      default: 'User'
    },
    reason: {
      type: String,
      required: [true, 'Auditing reason is required for administrative actions']
    },
    details: {
      type: Object,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ adminId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
