import { isPrivateIp, resolveIps } from "@vendin/utils";

import {
  type FacebookWhatsAppConfig,
  type WhatsAppProvider,
  maskPhoneNumber,
} from "./whatsapp-provider";

import type { consoleLogger } from "@vendin/logger";

const FACEBOOK_GRAPH_API_VERSION = "v21.0";

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
    this.apiVersion = config.apiVersion || FACEBOOK_GRAPH_API_VERSION;
    this.logger = logger;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    // WhatsApp API requires phone number without leading '+'
    const recipientPhone = phoneNumber.replace(/^\+/, "");

    try {
      const url = new URL(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
      );

      // SSRF Protection: Resolve hostname and validate IPs
      // We also strictly validate the hostname to prevent any manipulation
      if (url.hostname !== "graph.facebook.com") {
        this.logger.error(
          { hostname: url.hostname },
          "Blocked request to invalid hostname (SSRF Protection)",
        );
        throw new Error("Potential SSRF attack blocked: invalid hostname");
      }

      const ips = await resolveIps(url.hostname);

      if (ips.length === 0 || ips.some((ip: string) => isPrivateIp(ip))) {
        this.logger.error(
          { url: url.toString(), resolvedIps: ips },
          "Blocked request to private/internal URL (SSRF Protection)",
        );
        throw new Error("Potential SSRF attack blocked: private IP detected");
      }

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
        { to: maskPhoneNumber(recipientPhone) },
        "WhatsApp message sent successfully via Facebook",
      );
    } catch (error) {
      this.logger.error(
        { error, phoneNumber: maskPhoneNumber(phoneNumber) },
        "Error sending WhatsApp message via Facebook",
      );
      throw error;
    }
  }
}
