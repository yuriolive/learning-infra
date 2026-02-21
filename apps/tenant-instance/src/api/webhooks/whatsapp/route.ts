import crypto from "node:crypto";

import { processMessageWorkflow } from "../../../workflows/whatsapp/process-message-workflow";

import { WhatsAppPayloadSchema, type WhatsAppChangeType } from "./validators";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { Logger, MedusaContainer } from "@medusajs/framework/types";

/**
 * Processes a single change from the WhatsApp webhook payload.
 */
async function processWhatsAppChange(
  change: WhatsAppChangeType,
  scope: MedusaContainer,
  logger: Logger,
) {
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

    logger.info(`Processing WhatsApp message from ${threadId}`);

    // Await the workflow. In Cloud Run, returning a response
    // before background tasks finish will lead to CPU throttling and aborted tasks.
    await processMessageWorkflow(scope).run({
      input: {
        threadId,
        text,
      },
    });
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
