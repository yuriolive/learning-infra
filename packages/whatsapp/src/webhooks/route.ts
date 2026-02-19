import { verifyWhatsAppSignature } from "./signature";

import type { WhatsappWebhookService } from "./service";
import type { consoleLogger } from "@vendin/logger";

export interface WebhookRouteContext {
  logger: typeof consoleLogger;
  whatsappWebhookService: WhatsappWebhookService;
  appSecret: string;
  verifyToken: string;
}

export function createWebhookRoutes(context: WebhookRouteContext) {
  const { logger, whatsappWebhookService, appSecret, verifyToken } = context;

  return {
    handleRequest(request: Request): Promise<Response> | Response {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/").filter(Boolean);

      const isWebhookPath =
        pathParts.length === 2 &&
        pathParts[0] === "webhooks" &&
        pathParts[1] === "whatsapp";

      if (!isWebhookPath) {
        return new Response("Not found", { status: 404 });
      }

      if (request.method === "GET") {
        return handleGetRequest(url, verifyToken, logger);
      }

      if (request.method === "POST") {
        return handlePostRequest(
          request,
          appSecret,
          whatsappWebhookService,
          logger,
        );
      }

      return new Response("Not found", { status: 404 });
    },
  };
}

function handleGetRequest(
  url: URL,
  verifyToken: string,
  logger: typeof consoleLogger,
): Response {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("WhatsApp webhook verified successfully.");
    return new Response(challenge, { status: 200 });
  }

  logger.warn("WhatsApp webhook verification failed.");
  return new Response("Forbidden", { status: 403 });
}

async function handlePostRequest(
  request: Request,
  appSecret: string,
  whatsappWebhookService: WhatsappWebhookService,
  logger: typeof consoleLogger,
): Promise<Response> {
  try {
    const signature = request.headers.get("X-Hub-Signature-256");
    const rawBody = await request.clone().text();

    if (!signature || !verifyWhatsAppSignature(rawBody, signature, appSecret)) {
      logger.warn("Invalid WhatsApp webhook signature");
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = await request.json();
    await whatsappWebhookService.handleIncomingWebhook(payload);

    return new Response("OK", { status: 200 });
  } catch (error) {
    logger.error({ error }, "Error handling WhatsApp webhook POST");
    return new Response("Internal Server Error", { status: 500 });
  }
}
