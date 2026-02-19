import { verifyWhatsAppSignature } from "./signature";

import type { Logger } from "../../utils/logger";
import type { WhatsappWebhookService } from "./whatsapp.service";

export interface WebhookRouteContext {
  logger: Logger;
  whatsappWebhookService: WhatsappWebhookService;
  appSecret: string;
  verifyToken: string;
}

export function createWebhookRoutes(context: WebhookRouteContext) {
  const { logger, whatsappWebhookService, appSecret, verifyToken } = context;

  return {
    async handleRequest(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/").filter(Boolean);

      // Handle GET /webhooks/whatsapp (Verification request from Meta)
      if (
        pathParts.length === 2 &&
        pathParts[0] === "webhooks" &&
        pathParts[1] === "whatsapp" &&
        request.method === "GET"
      ) {
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === verifyToken) {
          logger.info("WhatsApp webhook verified successfully.");
          return new Response(challenge, { status: 200 });
        } else {
          logger.warn("WhatsApp webhook verification failed.");
          return new Response("Forbidden", { status: 403 });
        }
      }

      // Handle POST /webhooks/whatsapp (Message payload from Meta)
      if (
        pathParts.length === 2 &&
        pathParts[0] === "webhooks" &&
        pathParts[1] === "whatsapp" &&
        request.method === "POST"
      ) {
        try {
          // Meta signature validation
          const signature = request.headers.get("X-Hub-Signature-256");
          const rawBody = await request.clone().text();

          if (
            !signature ||
            !verifyWhatsAppSignature(rawBody, signature, appSecret)
          ) {
            logger.warn("Invalid WhatsApp webhook signature");
            return new Response("Unauthorized", { status: 401 });
          }

          const payload = await request.json();

          // Process in background or await
          // (Meta requires 200 OK fast, so we might want to use ctx.waitUntil if available)
          await whatsappWebhookService.handleIncomingWebhook(payload);

          return new Response("OK", { status: 200 });
        } catch (error) {
          logger.error({ error }, "Error handling WhatsApp webhook POST");
          return new Response("Internal Server Error", { status: 500 });
        }
      }

      return new Response("Not found", { status: 404 });
    },
  };
}
