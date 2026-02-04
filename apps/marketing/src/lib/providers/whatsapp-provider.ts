import type { consoleLogger } from "@vendin/utils/logger-cloudflare-factory";

/**
 * WhatsApp provider interface for sending messages
 */
export interface WhatsAppProvider {
  /**
   * Send a WhatsApp message to a phone number
   * @param phoneNumber - Phone number in international format (e.g., +1234567890)
   * @param message - Message text to send
   * @throws Error if message sending fails
   */
  sendMessage(phoneNumber: string, message: string): Promise<void>;
}

/**
 * Supported WhatsApp provider types
 */
export type WhatsAppProviderType = "facebook" | "twilio";

/**
 * Facebook WhatsApp Business API configuration
 */
export interface FacebookWhatsAppConfig {
  /** Access token from Meta Business */
  accessToken: string;
  /** WhatsApp Phone Number ID from Meta Business */
  phoneNumberId: string;
  /** Facebook Graph API version (default: v21.0) */
  apiVersion?: string;
}

/**
 * Twilio WhatsApp API configuration
 */
export interface TwilioWhatsAppConfig {
  /** Twilio Account SID */
  accountSid: string;
  /** Twilio Auth Token */
  authToken: string;
  /** Twilio WhatsApp-enabled phone number (e.g., +14155238886) */
  fromNumber: string;
}

/**
 * WhatsApp provider configuration
 */
export interface WhatsAppConfig {
  /** Provider type to use */
  provider: WhatsAppProviderType;
  /** Facebook configuration (required if provider is 'facebook') */
  facebook?: FacebookWhatsAppConfig;
  /** Twilio configuration (required if provider is 'twilio') */
  twilio?: TwilioWhatsAppConfig;
  /** Logger instance for error and debug logging */
  logger: typeof consoleLogger;
}

/**
 * Create a WhatsApp provider based on configuration
 * @param config - Provider configuration
 * @returns WhatsApp provider instance
 * @throws Error if configuration is invalid or provider type is unsupported
 */
export function createWhatsAppProvider(
  config: WhatsAppConfig,
): WhatsAppProvider {
  switch (config.provider) {
    case "facebook": {
      if (!config.facebook) {
        throw new Error(
          "Facebook configuration is required when provider is 'facebook'",
        );
      }
      // Dynamic import to avoid loading unused provider code
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FacebookWhatsAppProvider } = require("./facebook-provider");
      return new FacebookWhatsAppProvider(config.facebook, config.logger);
    }

    case "twilio": {
      if (!config.twilio) {
        throw new Error(
          "Twilio configuration is required when provider is 'twilio'",
        );
      }
      // Dynamic import to avoid loading unused provider code
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { TwilioWhatsAppProvider } = require("./twilio-provider");
      return new TwilioWhatsAppProvider(config.twilio, config.logger);
    }

    default: {
      throw new Error(
        `Unsupported WhatsApp provider: ${config.provider}. Supported providers: facebook, twilio`,
      );
    }
  }
}
