import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { updateInventoryFromWebhookStep } from "./steps/update-inventory-from-webhook-step.js";

interface SyncInventoryWebhookInput {
  payload: Record<string, any>;
}

export const syncInventoryFromWebhookWorkflow = createWorkflow(
  "sync-inventory-from-webhook",
  (input: SyncInventoryWebhookInput) => {
    const result = updateInventoryFromWebhookStep({ payload: input.payload });
    return new WorkflowResponse(result);
  },
);
