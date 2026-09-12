const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const otpService = require('../services/otp/otpService');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, username, email, password, avatar, phoneNumber, otp, verifyOtp } = req.body;

    if (!name || !username || !email || !password) {
      res.status(400);
      throw new Error('Please fill in all required fields');
    }

    const trimmedUsername = username.trim();
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      res.status(400);
      throw new Error('Username must be between 3 and 20 characters');
    }

    if (!usernameRegex.test(trimmedUsername)) {
      res.status(400);
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = trimmedUsername.toLowerCase();

    // Check if email exists
    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      res.status(400);
      throw new Error('Email is already registered');
    }

    // Check if username exists (case-insensitive)
    const usernameExists = await User.findOne({
      $or: [{ normalizedUsername }, { username: normalizedUsername }]
    });
    if (usernameExists) {
      res.status(400);
      throw new Error('Username is already taken');
    }

    // Process optional phone number
    let normalizedPhone = null;
    let isPhoneVerified = false;
    let phoneVerifiedAt = null;

    if (phoneNumber && phoneNumber.trim()) {
      normalizedPhone = User.normalizePhoneNumber(phoneNumber);
      const phoneExists = await User.findOne({ phoneNumber: normalizedPhone });
      if (phoneExists) {
        res.status(400);
        throw new Error('Phone number is already associated with another account');
      }

      // If user provided OTP during registration, verify it
      if (verifyOtp && otp) {
        await otpService.verifyOtp(normalizedPhone, otp);
        isPhoneVerified = true;
        phoneVerifiedAt = new Date();
      }
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      username: trimmedUsername,
      normalizedUsername,
      email: normalizedEmail,
      password,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${trimmedUsername}`,
      phoneNumber: normalizedPhone,
      phoneNumberVerified: isPhoneVerified,
      phoneNumberVerifiedAt: phoneVerifiedAt
    });

    if (user) {
      const token = generateToken(user._id);
      res.status(201).json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          phoneNumberVerified: user.phoneNumberVerified,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          createdAt: user.createdAt
        }
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    if (error.code === 11000) {
      res.status(400);
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === 'email') {
        return next(new Error('Email is already registered'));
      }
      if (field === 'phoneNumber') {
        return next(new Error('Phone number is already registered'));
      }
      return next(new Error('Username is already taken'));
    }
    next(error);
  }
};

// @desc    Authenticate user & get token (using Email or Username)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { emailOrUsername, email, username, password } = req.body;
    const rawIdentifier = emailOrUsername || email || username;

    if (!rawIdentifier || !password) {
      res.status(400);
      throw new Error('Please provide email/username and password');
    }

    const identifier = rawIdentifier.trim().toLowerCase();

    // Find user by email or normalized username
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { normalizedUsername: identifier },
        { username: identifier }
      ]
    }).select('+password');

    if (!user) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        phoneNumberVerified: user.phoneNumberVerified,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to user's phone for phone login
// @route   POST /api/auth/phone/login/send-otp
// @access  Public
const sendPhoneLoginOtp = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400);
      throw new Error('Phone number is required');
    }

    const normalizedPhone = User.normalizePhoneNumber(phoneNumber);
    const user = await User.findOne({ phoneNumber: normalizedPhone });

    if (!user) {
      res.status(404);
      throw new Error('No account found with this phone number. Please register first.');
    }

    if (!user.phoneNumberVerified) {
      res.status(400);
      throw new Error('Phone number is not verified on this account. Please log in with email/username.');
    }

    const otpResult = await otpService.sendOtp(normalizedPhone);

    res.status(200).json({
      message: 'Verification code sent to your phone',
      phoneNumber: normalizedPhone,
      cooldownSeconds: otpResult.cooldownSeconds,
      devOtp: otpResult.devOtp
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and log in user with phone
// @route   POST /api/auth/phone/login/verify-otp
// @access  Public
const verifyPhoneLoginOtp = async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      res.status(400);
      throw new Error('Phone number and OTP code are required');
    }

    const normalizedPhone = User.normalizePhoneNumber(phoneNumber);
    const user = await User.findOne({ phoneNumber: normalizedPhone });

    if (!user) {
      res.status(404);
      throw new Error('No account found with this phone number');
    }

    // Verify OTP
    await otpService.verifyOtp(normalizedPhone, otp);

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        phoneNumberVerified: user.phoneNumberVerified,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

// @desc    Change current user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error('Please provide both current password and new password');
    }

    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('New password must be at least 6 characters');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(400);
      throw new Error('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Password updated successfully',
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to phone for user registration
// @route   POST /api/auth/phone/register/send-otp
// @access  Public
const sendPhoneRegisterOtp = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400);
      throw new Error('Phone number is required');
    }

    const normalizedPhone = User.normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone || normalizedPhone.length < 8) {
      res.status(400);
      throw new Error('Please enter a valid phone number with country code (e.g. +1234567890)');
    }

    // Check if phone number is already registered to another account
    const existingUser = await User.findOne({ phoneNumber: normalizedPhone });
    if (existingUser) {
      res.status(400);
      throw new Error('Phone number is already associated with another account');
    }

    const otpResult = await otpService.sendOtp(normalizedPhone);

    res.status(200).json({
      message: 'Verification code sent to phone',
      phoneNumber: normalizedPhone,
      cooldownSeconds: otpResult.cooldownSeconds,
      devOtp: otpResult.devOtp
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  sendPhoneRegisterOtp,
  sendPhoneLoginOtp,
  verifyPhoneLoginOtp,
  getMe,
  changePassword
};

