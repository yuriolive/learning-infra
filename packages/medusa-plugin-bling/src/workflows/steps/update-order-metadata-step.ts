import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";

type UpdateOrderMetadataStepInput = {
  orderId: string;
  blingId?: string | number;
  payload?: any;
  response?: any;
  warnings?: string[];
};

export const updateOrderMetadataStep = createStep(
  "update-order-bling-metadata",
  async (input: UpdateOrderMetadataStepInput, { container }) => {
    const orderModule = container.resolve(Modules.ORDER);
    const { orderId, blingId, payload, response, warnings } = input;

    const order = await orderModule.retrieveOrder(orderId);

    const baseMetadata = { ...(order.metadata || {}) };
    const existingBling = (baseMetadata.bling as Record<string, any>) || {};

    const blingMetadata: Record<string, any> = {
      ...existingBling,
      last_sync_at: new Date().toISOString(),
      warnings,
    };

    if (blingId) {
        blingMetadata.sale_id = blingId;
    }
    if (payload) {
        blingMetadata.last_payload = payload;
    }
    if (response) {
        blingMetadata.last_response = response;
    }

    await orderModule.updateOrders(orderId, {
      metadata: {
        ...baseMetadata,
        bling: blingMetadata,
      },
    });

    return new StepResponse({ success: true });
  },
  async (input, { container }) => {
     // Compensation logic (optional)
  }
);
