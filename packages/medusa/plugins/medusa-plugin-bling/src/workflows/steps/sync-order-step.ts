import { Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BLING_MODULE } from "../../modules/bling/index.js";
import { BlingOrderMapper } from "../../modules/bling/utils/order-mapper.js";

import type BlingModuleService from "../../modules/bling/service.js";
import type { OrderSyncOptions } from "../../modules/bling/types/index.js";

interface SyncOrderStepInput {
  orderId: string;
  options?: OrderSyncOptions;
}

// Define a unified return type
export interface SyncOrderStepOutput {
  success: boolean;
  message?: string;
  blingId?: string | number;
  payload?: any;
  response?: any;
  warnings?: string[];
}

export const syncOrderToBlingStep = createStep(
  "sync-order-to-bling",
  async (input: SyncOrderStepInput, { container }) => {
    const blingService: BlingModuleService = container.resolve(BLING_MODULE);
    const orderModule = container.resolve(Modules.ORDER);
    const logger = container.resolve("logger");

    const { orderId, options = {} } = input;

    // 1. Fetch Order with relations
    const order = await orderModule.retrieveOrder(orderId, {
      relations: [
        "items",
        "shipping_address",
        "billing_address",
        "shipping_methods",
        "transactions",
      ],
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // 2. Get Config
    const config = await blingService.getBlingConfig();
    const preferences = blingService.mergePreferences(
      {},
      config?.syncPreferences ?? undefined,
    );

    if (!preferences.orders.enabled || !preferences.orders.send_to_bling) {
      return new StepResponse<SyncOrderStepOutput>({
        success: false,
        message: "Order sync disabled in preferences",
      });
    }

    // 3. Map Payload
    const warnings: string[] = [];
    let payload;
    try {
      payload = BlingOrderMapper.mapToBlingPayload(
        order,
        preferences,
        options,
        warnings,
      );
    } catch (error: any) {
      logger.error(`Failed to map order ${orderId} to Bling: ${error.message}`);
      throw error;
    }

    // 4. Send to Bling
    try {
      const response = await blingService.createOrder(payload);
      const blingId = response.data?.id || response.data?.numero;

      return new StepResponse<SyncOrderStepOutput>({
        success: true,
        blingId,
        payload,
        response: response.data,
        warnings,
      });
    } catch (error: any) {
      logger.error(`Failed to create order in Bling: ${error.message}`);
      throw error;
    }
  },
);
