const bcrypt = require('bcryptjs');
const Otp = require('../../models/Otp');
const User = require('../../models/User');
const MockOtpProvider = require('./providers/mockOtpProvider');
const TwilioOtpProvider = require('./providers/twilioOtpProvider');

class OtpService {
  constructor() {
    const providerType = process.env.OTP_PROVIDER || 'mock';
    if (providerType === 'twilio') {
      this.provider = new TwilioOtpProvider();
    } else {
      this.provider = new MockOtpProvider();
    }
  }

  async sendOtp(rawPhoneNumber) {
    const phoneNumber = User.normalizePhoneNumber(rawPhoneNumber);
    if (!phoneNumber || phoneNumber.length < 8) {
      throw new Error('Please enter a valid phone number with country code (e.g. +1234567890)');
    }

    // Check resend cooldown (60 seconds)
    const existingOtp = await Otp.findOne({ phoneNumber });
    if (existingOtp) {
      const timeElapsed = (Date.now() - new Date(existingOtp.createdAt).getTime()) / 1000;
      if (timeElapsed < 60) {
        const remaining = Math.ceil(60 - timeElapsed);
        throw new Error(`Please wait ${remaining} seconds before requesting a new OTP.`);
      }
      // Remove stale OTP before generating new one
      await Otp.deleteOne({ _id: existingOtp._id });
    }

    // Generate random 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otpCode, salt);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await Otp.create({
      phoneNumber,
      otpHash,
      attempts: 0,
      expiresAt
    });

    const result = await this.provider.sendOtp(phoneNumber, otpCode);

    return {
      success: true,
      message: 'OTP sent successfully',
      phoneNumber,
      cooldownSeconds: 60,
      devOtp: result.devOtp
    };
  }

  async verifyOtp(rawPhoneNumber, otpCode) {
    const phoneNumber = User.normalizePhoneNumber(rawPhoneNumber);
    if (!phoneNumber || !otpCode) {
      throw new Error('Phone number and OTP code are required');
    }

    const otpRecord = await Otp.findOne({ phoneNumber });
    if (!otpRecord) {
      throw new Error('OTP has expired or was not requested. Please request a new OTP code.');
    }

    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new Error('OTP code has expired. Please request a new OTP code.');
    }

    if (otpRecord.attempts >= 3) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new Error('Maximum verification attempts exceeded. Please request a new OTP code.');
    }

    // Increment attempt count
    otpRecord.attempts += 1;
    await otpRecord.save();

    const isMatch = await bcrypt.compare(otpCode.toString(), otpRecord.otpHash);
    if (!isMatch) {
      const remaining = 3 - otpRecord.attempts;
      if (remaining <= 0) {
        await Otp.deleteOne({ _id: otpRecord._id });
        throw new Error('Invalid OTP code. Maximum attempts exceeded. Please request a new code.');
      }
      throw new Error(`Invalid OTP code. ${remaining} attempt(s) remaining.`);
    }

    // Success! Remove OTP record to prevent reuse
    await Otp.deleteOne({ _id: otpRecord._id });

    return {
      success: true,
      phoneNumber
    };
  }
}

module.exports = new OtpService();
