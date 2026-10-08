const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  updateMessageCategory,
  getCategorizedMessages,
  createMemory,
  getMemories,
  deleteMemory,
  createFollowUp,
  getFollowUps,
  updateFollowUp,
  deleteFollowUp,
  getChatSummary,
  createDecision,
  updateDecisionStatus,
  getDecisions,
  deleteDecision,
  getActionsDashboard
} = require('../controllers/intelligenceController');

// All routes require authentication
router.use(protect);

// Message Categories
router.patch('/messages/:id/category', updateMessageCategory);
router.get('/messages/category/:conversationId', getCategorizedMessages);

// Chat Memories
router.post('/memories', createMemory);
router.get('/memories/:conversationId', getMemories);
router.delete('/memories/:id', deleteMemory);

// Smart Follow-ups & Tasks
router.post('/followups', createFollowUp);
router.get('/followups/:conversationId', getFollowUps);
router.patch('/followups/:id', updateFollowUp);
router.delete('/followups/:id', deleteFollowUp);

// Decision Lock
router.post('/decisions', createDecision);
router.get('/decisions/:conversationId', getDecisions);
router.patch('/decisions/:id', updateDecisionStatus);
router.delete('/decisions/:id', deleteDecision);

// Context Actions Dashboard
router.get('/dashboard/:conversationId', getActionsDashboard);

// AI Summary & Group "What did I miss?"
router.post('/summary', getChatSummary);

module.exports = router;
