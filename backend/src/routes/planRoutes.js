const express = require('express');
const router = express.Router();
const {
  createPlan,
  getPlansForConversation,
  respondToPlan
} = require('../controllers/planController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createPlan);
router.get('/conversation/:conversationId', getPlansForConversation);
router.put('/:id/respond', respondToPlan);

module.exports = router;
