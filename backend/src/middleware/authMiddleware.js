const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user || req.user.isDeleted) {
        return res.status(401).json({ message: 'Account not found or has been deleted.' });
      }

      if (req.user.status === 'suspended' || req.user.status === 'banned') {
        return res.status(403).json({ message: 'Your account has been suspended or banned by administration.' });
      }

      return next();
    } catch (error) {
      console.error('[Auth Middleware Error]:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    if (req.user.status === 'suspended' || req.user.status === 'banned') {
      return res.status(403).json({ message: 'Admin account suspended' });
    }
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Owner/Admin privileges required' });
};

const optionalProtect = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Ignore invalid token for public endpoints
    }
  }
  next();
};

module.exports = { protect, adminOnly, optionalProtect };
