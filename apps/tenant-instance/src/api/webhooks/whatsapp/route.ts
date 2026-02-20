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

export const POST = async (
  request: MedusaRequest,
  response: MedusaResponse,
) => {
  const agentService: AgentModuleService = request.scope.resolve(AGENT_MODULE);
  const logger: Logger = request.scope.resolve("logger");

  if (!agentService) {
    logger.error(
      "AgentModuleService not found. Ensure @vendin/medusa-ai-agent is enabled in medusa-config.ts",
    );
    response.status(500).json({ message: "Agent service unavailable" });
    return;
  }

  try {
    const payload = WhatsAppPayloadSchema.parse(request.body);

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        await processWhatsAppChange(change, agentService, logger);
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
