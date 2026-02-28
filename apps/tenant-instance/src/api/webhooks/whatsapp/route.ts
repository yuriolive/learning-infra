import crypto from "node:crypto";

import { Modules } from "@medusajs/framework/utils";

import { processMessageWorkflow } from "../../../workflows/whatsapp/process-message-workflow";

import { WhatsAppPayloadSchema, type WhatsAppChangeType } from "./validators";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type {
  Logger,
  MedusaContainer,
  ICacheService,
} from "@medusajs/framework/types";

/**
 * Processes a single change from the WhatsApp webhook payload.
 */
// eslint-disable-next-line complexity
async function processWhatsAppChange(
  change: WhatsAppChangeType,
  scope: MedusaContainer,
  logger: Logger,
) {
  const cacheService: ICacheService = scope.resolve(Modules.CACHE);
  if (!change.value.messages || change.value.messages.length === 0) return;

  for (const message of change.value.messages) {
    const contact = change.value.contacts?.find(
      (c) => c.wa_id === message.from,
    );

    if (!contact || !contact.wa_id) {
      logger.warn(
        `Received WhatsApp message without matching sender contact info (from: ${message.from}).`,
      );
      continue;
    }

    if (!message.text || !message.text.body) {
      logger.warn(
        `Received non-text WhatsApp message of type: ${message.type}. Agent currently only handles text.`,
      );
      continue;
    }

    const threadId = contact.wa_id;
    const text = message.text.body;

    const cacheKey = `whatsapp:msg:${message.id}`;
    const isProcessed = await cacheService.get(cacheKey);

    if (isProcessed) {
      logger.info(
        `WhatsApp message ${message.id} already processed or processing. Skipping.`,
      );
      continue;
    }

    // Set processing flag to prevent concurrent executions for the same message
    // Note: cacheService.set signature is: set(key, data, ttl) where ttl is seconds.
    // However, depending on module version, it might accept an options object instead,
    // like set(key, value, { ttl: seconds }). To be safe with framework/types, it's (key, value, ttl?: number).
    await cacheService.set(cacheKey, "processing", 300); // 5 minutes TTL for processing

    logger.info(`Processing WhatsApp message from ${threadId}`);

    try {
      // Await the workflow. In Cloud Run, returning a response
      // before background tasks finish will lead to CPU throttling and aborted tasks.
      await processMessageWorkflow(scope).run({
        input: {
          threadId,
          text,
        },
      });

      // Mark as processed (24 hours TTL)
      await cacheService.set(cacheKey, "completed", 86_400);
    } catch (error) {
      // Clean up the processing flag if it fails so it can be retried
      await cacheService.set(cacheKey, null, 1);
      throw error;
    }
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

export const POST = async (
  request: MedusaRequest,
  response: MedusaResponse,
) => {
  const logger: Logger = request.scope.resolve("logger");

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

    const expectedHashBuffer = Buffer.from(expectedHash, "hex");
    const signatureHash = signature.startsWith("sha256=")
      ? signature.slice(7)
      : signature;
    const signatureBuffer = Buffer.from(signatureHash, "hex");

    if (
      signatureHash.length !== expectedHash.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedHashBuffer)
    ) {
      logger.warn("Invalid WhatsApp webhook signature");
      response.status(401).send("Unauthorized");
      return;
    }

    const payload = WhatsAppPayloadSchema.parse(request.body);

    const promises: Array<Promise<void>> = [];
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        promises.push(processWhatsAppChange(change, request.scope, logger));
      }
    }
    await Promise.all(promises);

    response.status(200).send("OK");
  } catch (error) {
    logger.error(
      `Error handling WhatsApp webhook in Tenant Instance: ${error}`,
    );
    response.status(400).json({ message: "Invalid payload format" });
  }
};
