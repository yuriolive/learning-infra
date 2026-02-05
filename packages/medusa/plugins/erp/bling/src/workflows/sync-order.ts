import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { syncOrderToBlingStep } from "./steps/sync-order-step.js";
import { updateOrderMetadataStep } from "./steps/update-order-metadata-step.js";

import type { OrderSyncOptions } from "../modules/bling/types/index.js";

interface SyncOrderWorkflowInput {
  orderId: string;
  options?: OrderSyncOptions;
}

export const syncOrderToBlingWorkflow = createWorkflow(
  "sync-order-to-bling",
  (input: SyncOrderWorkflowInput) => {
    const syncResult = syncOrderToBlingStep(input);

    // We can use transform to safely access properties of syncResult which is a WorkflowData object
    // But passing it directly to the next step is also fine if the step accepts the whole object.
    // However, updateOrderMetadataStep expects specific fields.
    // We should pass the whole result or map fields.
    // Let's pass what we need.

    updateOrderMetadataStep({
      orderId: input.orderId,
      blingId: syncResult.blingId,
      payload: syncResult.payload,
      response: syncResult.response,
      warnings: syncResult.warnings,
    });

    return new WorkflowResponse(syncResult);
  },
);
