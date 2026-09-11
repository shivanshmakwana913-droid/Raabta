const ProviderInterface = require('./providerInterface');

class MockOtpProvider extends ProviderInterface {
  async sendOtp(phoneNumber, otp) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n==========================================`);
      console.log(`[RAABTA MOCK OTP SERVICE]`);
      console.log(`Target Phone: ${phoneNumber}`);
      console.log(`Verification Code (OTP): ${otp}`);
      console.log(`Expires In: 10 minutes`);
      console.log(`==========================================\n`);
    } else {
      // In production if mock provider is somehow enabled, mask output
      console.log(`[RAABTA MOCK OTP SERVICE] Mock OTP dispatched to ${phoneNumber.slice(0, 4)}****`);
    }

    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      provider: 'mock',
      // Send back devOtp in non-production API responses so dev UX can auto-fill or display test code easily
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    };
  }
}

module.exports = MockOtpProvider;
