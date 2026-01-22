import { Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

interface UpdateOrderMetadataStepInput {
  orderId: string;
  blingId?: string | number;
  payload?: any;
  response?: any;
  warnings?: string[];
}

export const updateOrderMetadataStep = createStep(
  "update-order-bling-metadata",
  async (input: UpdateOrderMetadataStepInput, { container }) => {
    const orderModule = container.resolve(Modules.ORDER);
    const { orderId, blingId, payload, response, warnings } = input;

    const order = await orderModule.retrieveOrder(orderId);

    // Capture previous metadata state for compensation
    const previousMetadata = order.metadata
      ? structuredClone(order.metadata)
      : {};

    const baseMetadata = { ...order.metadata };
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

    return new StepResponse({ success: true }, { orderId, previousMetadata });
  },
  async (compensationInput, { container }) => {
    if (!compensationInput || !compensationInput.previousMetadata) {
      return;
    }

    const orderModule = container.resolve(Modules.ORDER);
    const { orderId, previousMetadata } = compensationInput;

    // Revert metadata
    await orderModule.updateOrders(orderId, {
      metadata: previousMetadata,
    });
  },
);
