import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { phoneNumber } from "better-auth/plugins";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(drizzle((process.env.DB as unknown) as D1Database, { schema }), {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

        if (!token || !phoneNumberId) {
          console.error("WhatsApp credentials missing");
          return;
        }

        // WhatsApp API requires phone number without leading '+'
        const recipientPhone = phoneNumber.replace(/^\+/, "");

        try {
          const response = await fetch(
            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: recipientPhone,
                type: "text",
                text: {
                  body: `Your verification code is: ${code}`,
                },
              }),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            console.error("Failed to send WhatsApp message:", error);
          }
        } catch (e) {
          console.error("Error sending WhatsApp message:", e);
        }
      },
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber}@temp.local`,
      },
    }),
  ],
});
