import { Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import type { ProductSnapshot } from "../../modules/bling/utils/product-mapper.js";
import type { InventoryItemDTO } from "@medusajs/types";

interface UpdateInventoryStepInput {
  products: ProductSnapshot[];
}

export const updateInventoryStep = createStep(
  "update-medusa-inventory",
  async (input: UpdateInventoryStepInput, { container }) => {
    const inventoryModule = container.resolve(Modules.INVENTORY);
    const { products } = input;

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
      return new StepResponse({
        updated: 0,
        message: "No stock location found",
      });
    }

    let updatedCount = 0;

    for (const p of products) {
      for (const v of p.variants) {
        if (!v.sku) continue;
        const itemsList = await inventoryModule.listInventoryItems({
          sku: v.sku,
        });

        // Normalize result
        const inventoryItems = Array.isArray(itemsList)
          ? Array.isArray(itemsList[0])
            ? itemsList[0]
            : itemsList // Handle [items, count] or items[]
          : [];

        if (inventoryItems.length > 0) {
          const item = inventoryItems[0] as unknown as InventoryItemDTO;
          const totalStock = v.stock.reduce(
            (accumulator: number, s: { quantity: number }) =>
              accumulator + s.quantity,
            0,
          );

          const levelsList = await inventoryModule.listInventoryLevels({
            inventory_item_id: item.id,
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
                  inventory_item_id: item.id,
                  location_id: defaultLocationId,
                  stocked_quantity: totalStock,
                },
              ])
            : inventoryModule.createInventoryLevels({
                inventory_item_id: item.id,
                location_id: defaultLocationId,
                stocked_quantity: totalStock,
              }));

          updatedCount++;
        } else {
          const totalStock = v.stock.reduce(
            (accumulator: number, s: { quantity: number }) =>
              accumulator + s.quantity,
            0,
          );
          const item = await inventoryModule.createInventoryItems({
            sku: v.sku,
            title: p.name,
            requires_shipping: true,
          });

          await inventoryModule.createInventoryLevels({
            inventory_item_id: item.id,
            location_id: defaultLocationId,
            stocked_quantity: totalStock,
          });
          updatedCount++;
        }
      }
    }

    return new StepResponse({ updated: updatedCount });
  },
);
