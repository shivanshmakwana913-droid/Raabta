const mongoose = require('mongoose');

/**
 * Middleware to verify MongoDB database connectivity before executing route handlers.
 * If MongoDB is not in connected state (readyState !== 1), returns a 503 Service Unavailable response fast.
 */
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database unavailable. Please try again shortly.',
      code: 'DATABASE_UNAVAILABLE'
    });
  }
  next();
};

module.exports = checkDbConnection;
