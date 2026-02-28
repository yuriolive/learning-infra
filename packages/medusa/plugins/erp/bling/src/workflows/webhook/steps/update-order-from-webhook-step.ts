import { Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BLING_MODULE } from "../../../modules/bling/index.js";

import type BlingModuleService from "../../../modules/bling/service.js";

interface UpdateOrderWebhookStepInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
}

export interface UpdateOrderWebhookStepOutput {
  success: boolean;
  message?: string;
  updated?: number;
}

export const updateOrderFromWebhookStep = createStep(
  "update-order-from-webhook",
  async (input: UpdateOrderWebhookStepInput, { container }) => {
    const orderModule = container.resolve(Modules.ORDER);
    container.resolve(BLING_MODULE) as BlingModuleService;
    const logger = container.resolve("logger");

    const { payload } = input;

    if (!payload || !payload.data) {
      logger.warn("Invalid or missing data in Bling order webhook payload");
      return new StepResponse<UpdateOrderWebhookStepOutput>({
        message: "Invalid payload",
        success: false,
      });
    }

    const records = Array.isArray(payload.data) ? payload.data : [payload.data];
    let updatedCount = 0;

    for (const record of records) {
      try {
        const blingOrderId = record.id;
        const status = record.situacao?.id;

        if (!blingOrderId || !status) {
          logger.debug(
            `Skipping order update: Missing order ID or status in Bling payload`,
          );
          continue;
        }

        const medusaOrderId = record.loja?.numeroPedidoLoja;

        if (!medusaOrderId) {
          logger.debug(
            `Skipping order update: Could not find Medusa Order ID (numeroPedidoLoja) in payload.`,
          );
          continue;
        }

        const order = await orderModule.retrieveOrder(medusaOrderId);

        if (!order) {
          logger.debug(`Order ${medusaOrderId} not found in Medusa.`);
          continue;
        }

        const baseMetadata = { ...order.metadata };
        const existingBling =
          (baseMetadata.bling as Record<string, unknown>) || {};

        const blingMetadata = {
          ...existingBling,
          last_webhook_payload: record,
          last_webhook_sync_at: new Date().toISOString(),
          sale_id: blingOrderId,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {
          metadata: {
            ...baseMetadata,
            bling: blingMetadata,
          },
        };

        if (status === 12 || status === "12") {
          updateData.status = "canceled";
        }

        await orderModule.updateOrders(order.id, updateData);
        updatedCount++;
      } catch (error) {
        logger.error(
          `Error processing Bling order webhook for a record: ${error}`,
        );
      }
    }

    return new StepResponse<UpdateOrderWebhookStepOutput>({
      success: true,
      updated: updatedCount,
    });
  },
);
