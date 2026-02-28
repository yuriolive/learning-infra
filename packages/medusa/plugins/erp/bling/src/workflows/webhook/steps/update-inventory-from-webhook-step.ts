import { Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import type { InventoryItemDTO } from "@medusajs/types";

interface UpdateInventoryWebhookStepInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
}

export interface UpdateInventoryWebhookStepOutput {
  success: boolean;
  message?: string;
  error?: string;
  updated?: number;
}

export const updateInventoryFromWebhookStep = createStep(
  "update-inventory-from-webhook",
  async (input: UpdateInventoryWebhookStepInput, { container }) => {
    const inventoryModule = container.resolve(Modules.INVENTORY);
    const logger = container.resolve("logger");

    const { payload } = input;

    if (!payload || !payload.data) {
      logger.warn("Invalid or missing data in Bling stock webhook payload");
      return new StepResponse<UpdateInventoryWebhookStepOutput>({
        message: "Invalid payload",
        success: false,
      });
    }

    const records = Array.isArray(payload.data) ? payload.data : [payload.data];
    let updatedCount = 0;

    try {
      const [locations] = (await (
        inventoryModule as unknown as {
          listStockLocations: (
            selector: Record<string, unknown>,
            config?: Record<string, unknown>,
          ) => Promise<[unknown[], number]>;
        }
      ).listStockLocations({}, { take: 1 })) as [Array<{ id: string }>, number];

      const defaultLocationId = locations?.[0]?.id;

      if (!defaultLocationId) {
        logger.warn("No default stock location found in Medusa.");
        return new StepResponse<UpdateInventoryWebhookStepOutput>({
          message: "No stock location found",
          success: false,
          updated: 0,
        });
      }

      for (const item of records) {
        const sku = item.codigo;
        const stockQuantity = item.saldo;

        if (!sku || stockQuantity === undefined) {
          logger.debug(
            `Skipping stock update: Missing sku (${sku}) or stockQuantity (${stockQuantity})`,
          );
          continue;
        }

        const itemsList = await inventoryModule.listInventoryItems({
          sku: sku.toString(),
        });

        const inventoryItems = Array.isArray(itemsList)
          ? Array.isArray(itemsList[0])
            ? itemsList[0]
            : itemsList
          : [];

        if (inventoryItems.length > 0) {
          const inventoryItem =
            inventoryItems[0] as unknown as InventoryItemDTO;

          const levelsList = await inventoryModule.listInventoryLevels({
            inventory_item_id: inventoryItem.id,
            location_id: defaultLocationId,
          });

          const levels = Array.isArray(levelsList)
            ? Array.isArray(levelsList[0])
              ? levelsList[0]
              : levelsList
            : [];

          await (levels.length > 0
            ? (
                inventoryModule as unknown as {
                  updateInventoryLevels: (
                    data: Array<{
                      inventory_item_id: string;
                      location_id: string;
                      stocked_quantity: number;
                    }>,
                  ) => Promise<unknown>;
                }
              ).updateInventoryLevels([
                {
                  inventory_item_id: inventoryItem.id,
                  location_id: defaultLocationId,
                  stocked_quantity: Number(stockQuantity),
                },
              ])
            : inventoryModule.createInventoryLevels({
                inventory_item_id: inventoryItem.id,
                location_id: defaultLocationId,
                stocked_quantity: Number(stockQuantity),
              }));
          updatedCount++;
        } else {
          logger.debug(
            `Inventory item with SKU ${sku} not found. Skipping stock update.`,
          );
        }
      }
      return new StepResponse<UpdateInventoryWebhookStepOutput>({
        success: true,
        updated: updatedCount,
      });
    } catch (error) {
      logger.error(`Error processing Bling stock webhook: ${error}`);
      return new StepResponse<UpdateInventoryWebhookStepOutput>({
        error: String(error),
        success: false,
      });
    }
  },
);
