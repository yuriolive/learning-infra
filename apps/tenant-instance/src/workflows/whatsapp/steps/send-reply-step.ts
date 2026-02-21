import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { createWhatsAppProvider } from "@vendin/whatsapp";

import type { Logger } from "@medusajs/framework/types";
import type { Logger as VendinLogger } from "@vendin/logger";

export interface SendReplyStepInput {
  threadId: string;
  text: string;
}

export const sendReplyStep = createStep(
  "send-whatsapp-reply",
  async (input: SendReplyStepInput, { container }) => {
    const logger = container.resolve<Logger>("logger");

    const providerType = process.env.WHATSAPP_PROVIDER as
      | "facebook"
      | "twilio"
      | undefined;
    const providerString = providerType || "facebook";

    try {
      let provider: Awaited<ReturnType<typeof createWhatsAppProvider>>;

      if (providerString === "facebook") {
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

        if (!accessToken || !phoneNumberId) {
          throw new Error(
            "Missing required Facebook WhatsApp configuration (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_ID)",
          );
        }

        provider = await createWhatsAppProvider({
          provider: "facebook",
          facebook: { accessToken, phoneNumberId },
          logger: logger as unknown as VendinLogger,
        });
      } else {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

        if (!accountSid || !authToken || !fromNumber) {
          throw new Error(
            "Missing required Twilio WhatsApp configuration (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_FROM)",
          );
        }

        provider = await createWhatsAppProvider({
          provider: "twilio",
          twilio: { accountSid, authToken, fromNumber },
          logger: logger as unknown as VendinLogger,
        });
      }

      await provider.sendMessage(input.threadId, input.text);
      logger.info(`Successfully sent WhatsApp reply to ${input.threadId}`);
    } catch (error) {
      logger.error(
        `Failed to send WhatsApp reply to ${input.threadId}: ${error}`,
      );
      throw error;
    }

    return new StepResponse(undefined);
  },
);
