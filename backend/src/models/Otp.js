const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  otpHash: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Automatic TTL expiration
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
