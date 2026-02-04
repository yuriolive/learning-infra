import type {
  FacebookWhatsAppConfig,
  WhatsAppProvider,
} from "./whatsapp-provider";
import type { consoleLogger } from "@vendin/utils/logger-cloudflare-factory";

/**
 * Facebook WhatsApp Business API provider implementation
 */
export class FacebookWhatsAppProvider implements WhatsAppProvider {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string;
  private readonly logger: typeof consoleLogger;

  constructor(config: FacebookWhatsAppConfig, logger: typeof consoleLogger) {
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
    this.apiVersion = config.apiVersion || "v21.0";
    this.logger = logger;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    // WhatsApp API requires phone number without leading '+'
    const recipientPhone = phoneNumber.replace(/^\+/, "");

    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "text",
          text: {
            body: message,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(
          { error, statusCode: response.status },
          "Failed to send WhatsApp message via Facebook",
        );
        throw new Error(`Facebook WhatsApp API error: ${error}`);
      }

      this.logger.info(
        { to: recipientPhone },
        "WhatsApp message sent successfully via Facebook",
      );
    } catch (error) {
      this.logger.error(
        { error, phoneNumber },
        "Error sending WhatsApp message via Facebook",
      );
      throw error;
    }
  }
}
