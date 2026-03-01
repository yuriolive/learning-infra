import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";

import type {
  IInventoryService,
  InventoryItemDTO,
  InventoryLevelDTO,
} from "@medusajs/framework/types";
import type { MedusaContainer } from "@medusajs/medusa";

interface InventoryItemWithLevels extends InventoryItemDTO {
  location_levels?: InventoryLevelDTO[];
}

export function getAdminInventoryTools(container: MedusaContainer) {
  return [
    tool(
      async ({ sku_or_id }: { sku_or_id: string }) => {
        try {
          const inventoryService: IInventoryService = container.resolve(
            Modules.INVENTORY,
          );

          const [items] = await inventoryService.listInventoryItems(
            { q: sku_or_id },
            { relations: ["location_levels"] },
          );

          if (!items || !Array.isArray(items) || items.length === 0) {
            return "No inventory items found matching that SKU or ID.";
          }

          const result = (items as InventoryItemWithLevels[]).map((item) => ({
            id: item.id,
            sku: item.sku,
            stocked_quantity:
              item.location_levels?.reduce(
                (accumulator: number, level: InventoryLevelDTO) =>
                  accumulator + level.stocked_quantity,
                0,
              ) ?? 0,
            reserved_quantity:
              item.location_levels?.reduce(
                (accumulator: number, level: InventoryLevelDTO) =>
                  accumulator + level.reserved_quantity,
                0,
              ) ?? 0,
            levels: item.location_levels,
          }));

          return JSON.stringify(result);
        } catch (error) {
          return `Error fetching inventory: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_get_inventory",
        description:
          "Get inventory details (stock levels) for a product SKU or Inventory Item ID.",
        schema: z.object({
          sku_or_id: z.string().describe("Product SKU or Inventory Item ID"),
        }),
      },
    ),
    tool(
      async ({
        inventory_item_id,
        location_id,
        quantity_change,
      }: {
        inventory_item_id: string;
        location_id: string;
        quantity_change: number;
      }) => {
        try {
          const inventoryService: IInventoryService = container.resolve(
            Modules.INVENTORY,
          );

          const [levels] = await inventoryService.listInventoryLevels({
            inventory_item_id,
            location_id,
          });

          const currentLevel =
            levels && Array.isArray(levels) && levels.length > 0
              ? levels[0]
              : null;

          if (!currentLevel) {
            if (quantity_change < 0) {
              return "Cannot reduce stock for an inventory item that does not exist at this location.";
            }
            await inventoryService.createInventoryLevels([
              {
                inventory_item_id,
                location_id,
                stocked_quantity: quantity_change,
              },
            ]);
            return `Created new inventory level with ${quantity_change} items.`;
          }

          const newQuantity =
            (currentLevel.stocked_quantity ?? 0) + quantity_change;

          await inventoryService.updateInventoryLevels([
            {
              inventory_item_id,
              location_id,
              stocked_quantity: newQuantity,
            },
          ]);

          return `Inventory updated. New quantity: ${newQuantity}`;
        } catch (error) {
          return `Error updating inventory: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_update_inventory",
        description:
          "Adjust stocked quantity for an inventory item at a specific location.",
        schema: z.object({
          inventory_item_id: z.string(),
          location_id: z.string(),
          quantity_change: z
            .number()
            .describe("Positive to add stock, negative to reduce."),
        }),
      },
    ),
    tool(
      async ({ threshold = 10 }: { threshold?: number }) => {
        try {
          const inventoryService: IInventoryService = container.resolve(
            Modules.INVENTORY,
          );
          const lowStock: Array<{
            id: string;
            sku: string | null | undefined;
            total_stock: number;
          }> = [];

          const BATCH_SIZE = 250;
          let skip = 0;
          let hasMore = true;

          while (hasMore) {
            const [items, count] =
              await inventoryService.listAndCountInventoryItems(
                {},
                {
                  relations: ["location_levels"],
                  take: BATCH_SIZE,
                  skip,
                },
              );

            if (!items || items.length === 0) {
              break;
            }

            for (const item of items as InventoryItemWithLevels[]) {
              const totalStock =
                item.location_levels?.reduce(
                  (sum: number, level: InventoryLevelDTO) =>
                    sum + level.stocked_quantity,
                  0,
                ) ?? 0;
              if (totalStock < threshold) {
                lowStock.push({
                  id: item.id,
                  sku: item.sku,
                  total_stock: totalStock,
                });
              }
            }

            skip += items.length;
            hasMore = skip < count;
          }

          return JSON.stringify(lowStock);
        } catch (error) {
          return `Error checking low stock: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_low_stock_alerts",
        description:
          "List inventory items where total stock is below a threshold.",
        schema: z.object({
          threshold: z.number().optional().default(10),
        }),
      },
    ),
  ];
}
