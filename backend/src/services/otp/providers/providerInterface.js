/**
 * OTP Provider Interface Specification
 * All SMS/OTP providers (Mock, Twilio, MSG91, Firebase) must implement these methods.
 */
class ProviderInterface {
  async sendOtp(phoneNumber, otp) {
    throw new Error('sendOtp method must be implemented by provider');
  }
}

module.exports = ProviderInterface;
