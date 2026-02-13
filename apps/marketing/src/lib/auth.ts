import { consoleLogger as logger } from "@vendin/logger/cloudflare";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "../db/schema";

import type { D1Database } from "@cloudflare/workers-types";

export const auth = betterAuth({
  database: drizzleAdapter(
    drizzle(process.env.DB as unknown as D1Database, { schema }),
    {
      provider: "sqlite",
    },
  ),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        const providerType = (process.env.WHATSAPP_PROVIDER || "facebook") as
          | "facebook"
          | "twilio";

        // Lazy import to avoid circular dependencies
        const { createWhatsAppProvider } =
          await import("./providers/whatsapp-provider");

        // Configure provider based on type
        const config =
          providerType === "facebook"
            ? {
                provider: "facebook" as const,
                facebook: {
                  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
                  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
                  apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
                },
                logger,
              }
            : {
                provider: "twilio" as const,
                twilio: {
                  accountSid: process.env.TWILIO_ACCOUNT_SID || "",
                  authToken: process.env.TWILIO_AUTH_TOKEN || "",
                  fromNumber: process.env.TWILIO_WHATSAPP_FROM || "",
                },
                logger,
              };

        // Validate required credentials
        if (providerType === "facebook") {
          if (
            !config.facebook?.accessToken ||
            !config.facebook?.phoneNumberId
          ) {
            logger.error(
              "Facebook WhatsApp credentials missing. OTP will not be sent.",
            );
            throw new Error("Facebook WhatsApp credentials not configured.");
          }
        } else {
          if (
            !config.twilio?.accountSid ||
            !config.twilio?.authToken ||
            !config.twilio?.fromNumber
          ) {
            logger.error(
              "Twilio WhatsApp credentials missing. OTP will not be sent.",
            );
            throw new Error("Twilio WhatsApp credentials not configured.");
          }
        }

        // Create provider and send message
        const provider = await createWhatsAppProvider(config);
        await provider.sendMessage(
          phoneNumber,
          `Your verification code is: ${code}`,
        );
      },
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber}@temp.local`,
      },
    }),
  ],
});
