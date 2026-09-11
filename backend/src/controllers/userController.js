const User = require('../models/User');

// @desc    Check username availability & validity
// @route   GET /api/users/check-username?username=...
// @access  Public (Optional auth)
const checkUsername = async (req, res, next) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(200).json({
        available: false,
        status: 'invalid',
        message: 'Username is required'
      });
    }

    const trimmed = username.trim();
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (trimmed.length < 3 || trimmed.length > 20 || !usernameRegex.test(trimmed)) {
      return res.status(200).json({
        available: false,
        status: 'invalid',
        message: 'Username must be 3–20 characters, containing only letters, numbers, and underscores.'
      });
    }

    const normalized = trimmed.toLowerCase();
    const existingUser = await User.findOne({
      $or: [{ normalizedUsername: normalized }, { username: normalized }]
    }).select('_id');

    // If current logged-in user is checking their own username
    const currentUserId = req.user?._id?.toString();
    if (existingUser && existingUser._id.toString() !== currentUserId) {
      return res.status(200).json({
        available: false,
        status: 'unavailable',
        message: 'Username is already taken'
      });
    }

    return res.status(200).json({
      available: true,
      status: 'available',
      message: 'Username is available'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public user profile by username
// @route   GET /api/users/profile/:username
// @access  Public
const getPublicProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    if (!username) {
      res.status(400);
      throw new Error('Username parameter is required');
    }

    const normalized = username.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ normalizedUsername: normalized }, { username: normalized }],
      isDeleted: { $ne: true }
    }).select('name username avatar bio isOnline lastSeen createdAt privacySettings');

    if (!user) {
      res.status(404);
      throw new Error('User profile not found');
    }

    // Apply privacy rules
    const isViewerUser = Boolean(req.user);
    const privacy = user.privacySettings || { lastSeen: 'everyone', onlineStatus: 'everyone', profile: 'everyone' };

    let publicBio = user.bio;
    if (privacy.profile === 'users' && !isViewerUser) {
      publicBio = 'Sign in to view bio and details';
    }

    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: publicBio,
        isOnline: privacy.onlineStatus === 'nobody' ? false : user.isOnline,
        lastSeen: privacy.lastSeen === 'nobody' ? null : user.lastSeen,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search users by name or username (excluding logged in user and deleted users)
// @route   GET /api/users/search?q=query
// @access  Private
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    let queryCondition = {
      _id: { $ne: req.user._id },
      isDeleted: { $ne: true }
    };

    if (q && q.trim() !== '') {
      const escapedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      queryCondition.$or = [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { username: { $regex: escapedQuery, $options: 'i' } }
      ];
    }

    const users = await User.find(queryCondition)
      .select('name username avatar bio isOnline lastSeen')
      .limit(20);

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user || user.isDeleted) {
      res.status(404);
      throw new Error('User profile not found');
    }
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.isDeleted) {
      res.status(404);
      throw new Error('User profile not found');
    }

    const { name, username, bio, avatar } = req.body;

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        res.status(400);
        throw new Error('Name cannot be empty');
      }
      user.name = name.trim();
    }

    if (username !== undefined) {
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

      const normalized = trimmedUsername.toLowerCase();

      // Check if username is taken by another user
      if (normalized !== (user.normalizedUsername || user.username.toLowerCase())) {
        const usernameExists = await User.findOne({
          $or: [{ normalizedUsername: normalized }, { username: normalized }],
          _id: { $ne: user._id }
        });

        if (usernameExists) {
          res.status(400);
          throw new Error('Username is already taken');
        }
        user.username = trimmedUsername;
        user.normalizedUsername = normalized;
      }
    }

    if (bio !== undefined) {
      if (bio.length > 200) {
        res.status(400);
        throw new Error('Bio cannot exceed 200 characters');
      }
      user.bio = bio.trim();
    }

    if (avatar !== undefined) {
      if (avatar && avatar.trim() !== '') {
        const isValidUrl = /^(https?:\/\/|\/|data:image\/)/.test(avatar.trim());
        if (!isValidUrl) {
          res.status(400);
          throw new Error('Please enter a valid HTTP(S) avatar image URL');
        }
        user.avatar = avatar.trim();
      } else {
        // Fallback default avatar generator if cleared
        user.avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;
      }
    }

    const updatedUser = await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        isOnline: updatedUser.isOnline,
        lastSeen: updatedUser.lastSeen,
        privacySettings: updatedUser.privacySettings,
        blockedUsers: updatedUser.blockedUsers,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400);
      return next(new Error('Username is already taken'));
    }
    next(error);
  }
};

// @desc    Block a user
// @route   POST /api/users/block/:id
// @access  Private
const blockUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    if (targetUserId === req.user._id.toString()) {
      res.status(400);
      throw new Error('You cannot block yourself');
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      res.status(404);
      throw new Error('User to block not found');
    }

    const user = await User.findById(req.user._id);
    if (!user.blockedUsers.includes(targetUserId)) {
      user.blockedUsers.push(targetUserId);
      await user.save();
    }

    res.status(200).json({
      message: 'User blocked successfully',
      blockedUsers: user.blockedUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unblock a user
// @route   DELETE /api/users/block/:id
// @access  Private
const unblockUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const user = await User.findById(req.user._id);

    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== targetUserId.toString()
    );
    await user.save();

    res.status(200).json({
      message: 'User unblocked successfully',
      blockedUsers: user.blockedUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of blocked users
// @route   GET /api/users/blocked
// @access  Private
const getBlockedUsers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('blockedUsers', 'name username avatar bio');
    res.status(200).json({ blockedUsers: user.blockedUsers || [] });
  } catch (error) {
    next(error);
  }
};

// @desc    Update privacy settings
// @route   PUT /api/users/privacy
// @access  Private
const updatePrivacySettings = async (req, res, next) => {
  try {
    const { lastSeen, onlineStatus, profile } = req.body;
    const user = await User.findById(req.user._id);

    if (lastSeen && ['everyone', 'nobody'].includes(lastSeen)) {
      user.privacySettings.lastSeen = lastSeen;
    }
    if (onlineStatus && ['everyone', 'nobody'].includes(onlineStatus)) {
      user.privacySettings.onlineStatus = onlineStatus;
    }
    if (profile && ['everyone', 'users'].includes(profile)) {
      user.privacySettings.profile = profile;
    }

    await user.save();

    res.status(200).json({
      message: 'Privacy settings updated successfully',
      privacySettings: user.privacySettings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete / Anonymize Account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400);
      throw new Error('Password is required to confirm account deletion');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(400);
      throw new Error('Incorrect password');
    }

    // Safely anonymize profile data while maintaining DB reference integrity
    user.name = 'Deleted User';
    user.username = `deleted_${user._id.toString().substring(0, 8)}`;
    user.normalizedUsername = `deleted_${user._id.toString().substring(0, 8)}`;
    user.email = `deleted_${user._id}@deleted.local`;
    user.password = `deleted_${Date.now()}`;
    user.bio = 'This account has been deleted.';
    user.avatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=deleted';
    user.isOnline = false;
    user.isDeleted = true;
    user.blockedUsers = [];

    await user.save();

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const otpService = require('../services/otp/otpService');

// @desc    Send OTP to user's phone for verification in Settings
// @route   POST /api/users/phone/send-otp
// @access  Private
const sendUserPhoneOtp = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400);
      throw new Error('Phone number is required');
    }

    const normalizedPhone = User.normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone || normalizedPhone.length < 8) {
      res.status(400);
      throw new Error('Please enter a valid phone number with country code');
    }

    // Check if phone number is already registered by another account
    const existing = await User.findOne({
      phoneNumber: normalizedPhone,
      _id: { $ne: req.user._id }
    });

    if (existing) {
      res.status(400);
      throw new Error('This phone number is already associated with another account');
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

// @desc    Verify OTP and attach phone number to authenticated user
// @route   POST /api/users/phone/verify-otp
// @access  Private
const verifyUserPhoneOtp = async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      res.status(400);
      throw new Error('Phone number and OTP code are required');
    }

    const normalizedPhone = User.normalizePhoneNumber(phoneNumber);

    // Verify OTP
    await otpService.verifyOtp(normalizedPhone, otp);

    const user = await User.findById(req.user._id);
    user.phoneNumber = normalizedPhone;
    user.phoneNumberVerified = true;
    user.phoneNumberVerifiedAt = new Date();
    await user.save();

    res.status(200).json({
      message: 'Phone number verified and updated successfully',
      phoneNumber: user.phoneNumber,
      phoneNumberVerified: user.phoneNumberVerified,
      phoneNumberVerifiedAt: user.phoneNumberVerifiedAt
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove phone number from user account
// @route   DELETE /api/users/phone
// @access  Private
const removeUserPhone = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.phoneNumber = null;
    user.phoneNumberVerified = false;
    user.phoneNumberVerifiedAt = null;
    await user.save();

    res.status(200).json({
      message: 'Phone number removed from account successfully',
      phoneNumber: null,
      phoneNumberVerified: false
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's private phone identity details for Settings
// @route   GET /api/users/me/phone
// @access  Private
const getUserPhoneDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      phoneNumber: user.phoneNumber,
      phoneNumberVerified: user.phoneNumberVerified,
      phoneNumberVerifiedAt: user.phoneNumberVerifiedAt
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
