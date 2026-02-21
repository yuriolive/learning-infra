import crypto from "node:crypto";

import { AGENT_MODULE, type AgentModuleService } from "@vendin/medusa-ai-agent";

import { WhatsAppPayloadSchema, type WhatsAppChangeType } from "./validators";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { Logger } from "@medusajs/framework/types";

/**
 * Processes a single change from the WhatsApp webhook payload.
 */
async function processWhatsAppChange(
  change: WhatsAppChangeType,
  agentService: AgentModuleService,
  logger: Logger,
) {
  if (!change.value.messages?.[0]) return;

  const message = change.value.messages[0];
  const contact = change.value.contacts?.[0];

  if (!contact || !contact.wa_id) {
    logger.warn(
      "Received WhatsApp message without sender contact info (wa_id).",
    );
    return;
  }

  if (!message.text || !message.text.body) {
    logger.warn(
      `Received non-text WhatsApp message of type: ${message.type}. Agent currently only handles text.`,
    );
    return;
  }

  const threadId = contact.wa_id;
  const text = message.text.body;

  logger.info(`Processing WhatsApp message from ${threadId}`);

  try {
    await agentService.processMessage(threadId, text, {
      role: "customer",
    });
  } catch (processError) {
    logger.error(`Error processing message from ${threadId}: ${processError}`);
  }
}

export const GET = (request: MedusaRequest, response: MedusaResponse) => {
  const mode = request.query["hub.mode"];
  const token = request.query["hub.verify_token"];
  const challenge = request.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    response.status(200).send(challenge);
    return;
  }

  response.status(403).send("Forbidden");
};

export const POST = (request: MedusaRequest, response: MedusaResponse) => {
  const logger: Logger = request.scope.resolve("logger");
  let agentService: AgentModuleService;

  try {
    agentService = request.scope.resolve(AGENT_MODULE);
  } catch {
    logger.error(
      "AgentModuleService not found. Ensure @vendin/medusa-ai-agent is enabled in medusa-config.ts",
    );
    response.status(500).json({ message: "Agent service unavailable" });
    return;
  }

  try {
    const secret = process.env.WHATSAPP_APP_SECRET;

    if (!secret) {
      logger.error("WHATSAPP_APP_SECRET is not configured");
      response.status(500).json({ message: "Server configuration error" });
      return;
    }

    const signature = request.headers["x-hub-signature-256"] as
      | string
      | undefined;

    if (!signature) {
      logger.warn("Missing WhatsApp webhook signature");
      response.status(401).send("Unauthorized");
      return;
    }

    if (!request.rawBody) {
      logger.error("Raw request body is missing, cannot verify signature");
      response.status(500).json({ message: "Server configuration error" });
      return;
    }

    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(request.rawBody)
      .digest("hex");

    if (signature !== `sha256=${expectedHash}`) {
      logger.warn("Invalid WhatsApp webhook signature");
      response.status(401).send("Unauthorized");
      return;
    }

    const payload = WhatsAppPayloadSchema.parse(request.body);

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        processWhatsAppChange(change, agentService, logger).catch((error) => {
          logger.error(
            `Unhandled error in background WhatsApp processing: ${error}`,
          );
        });
      }
    }

    response.status(200).send("OK");
  } catch (error) {
    logger.error(
      `Error handling WhatsApp webhook in Tenant Instance: ${error}`,
    );
    response.status(400).json({ message: "Invalid payload format" });
  }
};
