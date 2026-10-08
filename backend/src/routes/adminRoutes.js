const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getAdminStats,
  getUsers,
  updateUserStatus,
  updateUserRole,
  getGroups,
  getAuditLogs,
  getSystemHealth,
  requestConversationInspection
} = require('../controllers/adminController');

// Rate limiter for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Admin request rate limit reached. Please slow down.' }
});

// All routes are strictly protected with JWT authentication + Server-Verified Admin Role check
router.use(protect);
router.use(adminOnly);
router.use(adminLimiter);

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.put('/users/:userId/status', updateUserStatus);
router.put('/users/:userId/role', updateUserRole);
router.get('/groups', getGroups);
router.get('/audit-logs', getAuditLogs);
router.get('/health', getSystemHealth);
router.post('/conversations/:conversationId/inspect-request', requestConversationInspection);

module.exports = router;
