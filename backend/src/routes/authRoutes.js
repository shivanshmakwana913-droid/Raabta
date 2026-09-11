const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  sendPhoneLoginOtp,
  verifyPhoneLoginOtp,
  getMe,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/phone/login/send-otp', sendPhoneLoginOtp);
router.post('/phone/login/verify-otp', verifyPhoneLoginOtp);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
