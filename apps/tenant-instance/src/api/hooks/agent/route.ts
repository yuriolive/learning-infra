import { AGENT_MODULE } from "../../../modules/agent";

import type AgentModuleService from "../../../modules/agent/service";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

interface Logger {
  warn: (message: string, context?: unknown) => void;
  error: (message: string, context?: unknown) => void;
  info: (message: string, context?: unknown) => void;
}

type ExtractionResult =
  | { phone: string; success: true; text: string }
  | { error: string; success: false; type?: string; warning?: string };

// Helper to extract message from Meta Webhook
// eslint-disable-next-line @typescript-eslint/no-explicit-any, complexity
const extractMetaMessage = (body: any): ExtractionResult => {
  if (!body.entry || !Array.isArray(body.entry) || body.entry.length === 0) {
    return {
      success: false,
      error: "ignored_malformed",
      warning: "Agent API: Received empty or invalid 'entry' in body.",
    };
  }

  const changes = body.entry[0].changes;
  if (!Array.isArray(changes) || changes.length === 0) {
    return {
      success: false,
      error: "ignored_malformed",
      warning: "Agent API: Received empty or invalid 'changes' in body.",
    };
  }

  const value = changes[0].value;
  if (
    !value ||
    !value.messages ||
    !Array.isArray(value.messages) ||
    value.messages.length === 0
  ) {
    return {
      success: false,
      error: "ignored_malformed",
      warning: "Agent API: Received empty or invalid 'messages' in body.",
    };
  }

  const message = value.messages[0];
  if (message.type !== "text") {
    return { success: false, error: "ignored_type", type: message.type };
  }

  return { success: true, phone: message.from, text: message.text?.body };
};

export const POST = async (
  medusaRequest: MedusaRequest,
  medusaResponse: MedusaResponse,
) => {
  const internalSecret = medusaRequest.headers["x-internal-secret"];
  const configuredSecret = process.env.INTERNAL_API_TOKEN;

  // Resolve logger
  const logger = medusaRequest.scope.resolve<Logger>("logger");

  if (!configuredSecret || internalSecret !== configuredSecret) {
    medusaResponse.status(401).json({ message: "Unauthorized" });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = medusaRequest.body as any;
  let phone: string | undefined;
  let text: string | undefined;

  try {
    if (body.entry) {
      // Format B: Meta Webhook
      const extraction = extractMetaMessage(body);
      if (!extraction.success) {
        if (extraction.warning) logger.warn(extraction.warning);
        medusaResponse
          .status(200)
          .json({ status: extraction.error, type: extraction.type });
        return;
      }
      phone = extraction.phone;
      text = extraction.text;
    } else {
      // Format A: Direct
      phone = body.phone;
      text = body.text;
    }

    if (!phone || !text) {
      logger.warn("Agent API: Missing phone or text.", { phone, text });
      medusaResponse.status(200).json({ status: "ignored_missing_fields" });
      return;
    }

    const agentModule =
      medusaRequest.scope.resolve<AgentModuleService>(AGENT_MODULE);
    const response = await agentModule.processMessage(phone, text);

    medusaResponse.status(200).json({ response });
  } catch (error) {
    logger.error("Agent API: Error processing message", error);
    medusaResponse.status(500).json({ error: "Agent unavailable" });
  }
};
