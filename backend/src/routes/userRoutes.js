const express = require('express');
const router = express.Router();
const {
  checkUsername,
  getPublicProfile,
  searchUsers,
  getProfile,
  updateProfile,
  blockUser,
  unblockUser,
  getBlockedUsers,
  updatePrivacySettings,
  deleteAccount,
  sendUserPhoneOtp,
  verifyUserPhoneOtp,
  removeUserPhone,
  getUserPhoneDetails
} = require('../controllers/userController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

// Public / Optional Auth routes
router.get('/check-username', optionalProtect, checkUsername);
router.get('/profile/:username', optionalProtect, getPublicProfile);

// Protected routes
router.get('/search', protect, searchUsers);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

router.post('/block/:id', protect, blockUser);
router.delete('/block/:id', protect, unblockUser);
router.get('/blocked', protect, getBlockedUsers);

router.put('/privacy', protect, updatePrivacySettings);
router.delete('/account', protect, deleteAccount);

// Protected Phone Identity routes
router.post('/phone/send-otp', protect, sendUserPhoneOtp);
router.post('/phone/verify-otp', protect, verifyUserPhoneOtp);
router.delete('/phone', protect, removeUserPhone);
router.get('/me/phone', protect, getUserPhoneDetails);

module.exports = router;
