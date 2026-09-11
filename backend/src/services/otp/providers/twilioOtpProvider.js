const ProviderInterface = require('./providerInterface');

class TwilioOtpProvider extends ProviderInterface {
  constructor() {
    super();
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async sendOtp(phoneNumber, otp) {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error('Twilio credentials not configured in production environment');
    }

    // Stub for real Twilio client invocation when twilio package is installed
    // const client = require('twilio')(this.accountSid, this.authToken);
    // const message = await client.messages.create({
    //   body: `Your Raabta security code is: ${otp}. Do not share it with anyone.`,
    //   from: this.fromNumber,
    //   to: phoneNumber
    // });

    return {
      success: true,
      provider: 'twilio',
      messageId: `twilio_stub_${Date.now()}`
    };
  }
}

module.exports = TwilioOtpProvider;
