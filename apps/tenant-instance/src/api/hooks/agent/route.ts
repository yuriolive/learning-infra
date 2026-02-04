import { AGENT_MODULE } from "@vendin/medusa-ai-agent";
import { z } from "zod";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { AgentModuleService } from "@vendin/medusa-ai-agent";

interface Logger {
  warn: (message: string, context?: unknown) => void;
  error: (message: string, context?: unknown) => void;
  info: (message: string, context?: unknown) => void;
}

type ExtractionResult =
  | { phone: string; success: true; text: string }
  | { error: string; success: false; type?: string; warning?: string };

const MetaMessageSchema = z.object({
  from: z.string(),
  type: z.string(),
  text: z
    .object({
      body: z.string(),
    })
    .optional(),
});

const MetaValueSchema = z.object({
  messages: z.array(MetaMessageSchema).min(1),
});

const MetaChangeSchema = z.object({
  value: MetaValueSchema,
});

const MetaEntrySchema = z.object({
  changes: z.array(MetaChangeSchema).min(1),
});

const MetaWebhookBodySchema = z.object({
  object: z.string().optional(),
  entry: z.array(MetaEntrySchema).min(1),
});

const DirectBodySchema = z.object({
  phone: z.string().optional(),
  text: z.string().optional(),
});

// Helper to extract message from Meta Webhook

const extractMetaMessage = (body: unknown): ExtractionResult => {
  const result = MetaWebhookBodySchema.safeParse(body);

  if (!result.success) {
    const errorIssues = result.error.issues;
    const hasEntryError = errorIssues.some(
      (issue) => issue.path[0] === "entry",
    );

    if (hasEntryError) {
      return {
        success: false,
        error: "ignored_malformed",
        warning: "Agent API: Received empty or invalid 'entry' in body.",
      };
    }

    return {
      success: false,
      error: "ignored_malformed",
      warning: "Agent API: Received empty or invalid body structure.",
    };
  }

  const data = result.data;
  const change = data.entry[0].changes[0];
  const value = change.value;
  const message = value.messages[0];

  if (message.type !== "text") {
    return { success: false, error: "ignored_type", type: message.type };
  }

  const textBody = message.text?.body;
  if (!textBody) {
    return {
      success: false,
      error: "ignored_malformed",
      warning: "Agent API: Received text message with empty body.",
    };
  }

  return { success: true, phone: message.from, text: textBody };
};

const extractDirectMessage = (body: unknown): ExtractionResult => {
  const directResult = DirectBodySchema.safeParse(body);
  if (
    directResult.success &&
    (directResult.data.phone || directResult.data.text)
  ) {
    return {
      success: true,
      phone: directResult.data.phone ?? "",
      text: directResult.data.text ?? "",
    };
  }
  return {
    success: false,
    error: "ignored_missing_fields",
    warning: "Agent API: Missing phone or text.",
  };
};

const handleMessageProcessing = async (
  phone: string,
  text: string,
  medusaRequest: MedusaRequest,
  medusaResponse: MedusaResponse,
) => {
  const agentModule =
    medusaRequest.scope.resolve<AgentModuleService>(AGENT_MODULE);
  const response = await agentModule.processMessage(phone, text);
  medusaResponse.status(200).json({ response });
};

const validateAndExtractBody = (
  body: unknown,
  logger: Logger,
  medusaResponse: MedusaResponse,
): { phone: string; text: string } | null => {
  // Check if it looks like a Meta Webhook (basic duck typing for schema selection)
  const isMeta =
    body &&
    typeof body === "object" &&
    "entry" in body &&
    Array.isArray((body as { entry: unknown }).entry);

  if (isMeta) {
    const extraction = extractMetaMessage(body);
    if (!extraction.success) {
      if (extraction.warning) logger.warn(extraction.warning);
      medusaResponse.status(200).json({
        status: extraction.error,
        type: extraction.type ?? "unknown",
      });
      return null;
    }
    return { phone: extraction.phone, text: extraction.text };
  }

  // Format A: Direct
  const extraction = extractDirectMessage(body);
  if (extraction.success) {
    return { phone: extraction.phone, text: extraction.text };
  }

  logger.warn(extraction.warning ?? "Agent API: Invalid body.", { body });
  medusaResponse.status(200).json({ status: extraction.error });
  return null;
};

export const POST = async (
  medusaRequest: MedusaRequest,
  medusaResponse: MedusaResponse,
) => {
  const logger = medusaRequest.scope.resolve<Logger>("logger");

  try {
    const extraction = validateAndExtractBody(
      medusaRequest.body,
      logger,
      medusaResponse,
    );
    if (!extraction) return;

    const { phone, text } = extraction;
    if (!phone || !text) {
      // Double check for empty strings if schema allowed them but logic requires them
      logger.warn("Agent API: Missing phone or text.", { phone, text });
      medusaResponse.status(200).json({ status: "ignored_missing_fields" });
      return;
    }

    await handleMessageProcessing(phone, text, medusaRequest, medusaResponse);
  } catch (error) {
    logger.error("Agent API: Error processing message", error);
    medusaResponse.status(500).json({ error: "Agent unavailable" });
  }
};
