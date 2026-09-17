const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';
  let errorCode = undefined;

  // Handle Mongoose Connection / Buffering / Timeout errors
  if (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    (err.message && err.message.includes('buffering timed out')) ||
    (err.message && err.message.includes('Client must be connected')) ||
    (err.message && err.message.includes('topology was destroyed'))
  ) {
    statusCode = 503;
    message = 'Database unavailable. Please try again shortly.';
    errorCode = 'DATABASE_UNAVAILABLE';
  }

  // Handle Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Account with this ${field} already exists.`;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
  }

  // Handle CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Resource not found or invalid ID format';
  }

  res.status(statusCode).json({
    message,
    ...(errorCode && { code: errorCode }),
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = { notFound, errorHandler };
