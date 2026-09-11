const express = require('express');
const router = express.Router();
const {
  sendMessage,
  editMessage,
  deleteMessage,
  reactMessage,
  uploadImage,
  getMessages,
  markMessagesSeen,
  searchMessages
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

router.use(protect);

router.post('/', sendMessage);
router.post('/upload', upload.single('image'), uploadImage);
router.post('/mark-seen', markMessagesSeen);
router.get('/search', searchMessages);

router.route('/:id')
  .put(editMessage)
  .delete(deleteMessage);

router.post('/:id/react', reactMessage);
router.get('/:conversationId', getMessages);

module.exports = router;
