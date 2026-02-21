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
      const provider =
        providerString === "facebook"
          ? await createWhatsAppProvider({
              provider: "facebook",
              facebook: {
                accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
                phoneNumberId: process.env.WHATSAPP_PHONE_ID || "",
              },
              logger: logger as unknown as VendinLogger,
            })
          : await createWhatsAppProvider({
              provider: "twilio",
              twilio: {
                accountSid: process.env.TWILIO_ACCOUNT_SID || "",
                authToken: process.env.TWILIO_AUTH_TOKEN || "",
                fromNumber: process.env.TWILIO_WHATSAPP_FROM || "",
              },
              logger: logger as unknown as VendinLogger,
            });

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
