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

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const bodyParams = new URLSearchParams({
        To: phoneNumber,
        From: this.fromNumber,
        Body: `Your Raabta security code is: ${otp}. Do not share this code with anyone. Valid for 10 minutes.`
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Twilio Error]:', data.code, data.message);
        throw new Error(data.message || 'SMS delivery failed via provider');
      }

      return {
        success: true,
        provider: 'twilio',
        messageId: data.sid
      };
    } catch (error) {
      if (error.message && error.message.includes('Twilio credentials not configured')) {
        throw error;
      }
      throw new Error(`SMS Provider Error: ${error.message || 'Failed to dispatch SMS code'}`);
    }
  }
}

module.exports = TwilioOtpProvider;

