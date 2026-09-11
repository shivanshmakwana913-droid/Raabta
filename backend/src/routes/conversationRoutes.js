const express = require('express');
const router = express.Router();
const {
  accessConversation,
  fetchConversations,
  createGroupConversation,
  renameGroup,
  addToGroup,
  removeFromGroup
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(accessConversation)
  .get(fetchConversations);

router.post('/group', createGroupConversation);
router.put('/group/rename', renameGroup);
router.put('/group/add', addToGroup);
router.put('/group/remove', removeFromGroup);

module.exports = router;
