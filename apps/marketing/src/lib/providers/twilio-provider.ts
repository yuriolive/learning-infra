import {
  type TwilioWhatsAppConfig,
  type WhatsAppProvider,
  maskPhoneNumber,
} from "./whatsapp-provider";

import type { consoleLogger } from "@vendin/logger";

/**
 * Twilio WhatsApp API provider implementation
 */
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly logger: typeof consoleLogger;

  constructor(config: TwilioWhatsAppConfig, logger: typeof consoleLogger) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
    this.logger = logger;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      // Twilio expects E.164 format with 'whatsapp:' prefix
      const fromWhatsApp = `whatsapp:${this.fromNumber}`;
      const toWhatsApp = `whatsapp:${phoneNumber}`;

      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

      // Twilio uses Basic Auth with AccountSID:AuthToken
      const authHeader = Buffer.from(
        `${this.accountSid}:${this.authToken}`,
      ).toString("base64");

      const body = new URLSearchParams({
        From: fromWhatsApp,
        To: toWhatsApp,
        Body: message,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(
          { error, statusCode: response.status },
          "Failed to send WhatsApp message via Twilio",
        );
        throw new Error(`Twilio WhatsApp API error: ${error}`);
      }

      this.logger.info(
        { to: maskPhoneNumber(phoneNumber) },
        "WhatsApp message sent successfully via Twilio",
      );
    } catch (error) {
      this.logger.error(
        { error, phoneNumber: maskPhoneNumber(phoneNumber) },
        "Error sending WhatsApp message via Twilio",
      );
      throw error;
    }
  }
}
