import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { updateOrderFromWebhookStep } from "./steps/update-order-from-webhook-step.js";

interface SyncOrderWebhookInput {
  payload: Record<string, any>;
}

export const syncOrderFromWebhookWorkflow = createWorkflow(
  "sync-order-from-webhook",
  (input: SyncOrderWebhookInput) => {
    const result = updateOrderFromWebhookStep({ payload: input.payload });
    return new WorkflowResponse(result);
  },
);
