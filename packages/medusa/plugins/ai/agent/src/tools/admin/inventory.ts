import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";
import type { MedusaContainer } from "@medusajs/medusa";

// Helper type wrapper if strict types aren't available for the specific service interface in the environment
type InventoryService = any;

export function getAdminInventoryTools(container: MedusaContainer) {
  return [
    tool(
      async ({ sku_or_id }: { sku_or_id: string }) => {
        try {
          // Resolving Inventory Module
          const inventoryService: InventoryService = container.resolve(Modules.INVENTORY);

          // Search for inventory items matching the SKU or ID
          const [items] = await inventoryService.listInventoryItems({
            q: sku_or_id,
          }, { relations: ["location_levels"] });

          if (items.length === 0) {
            return "No inventory items found matching that SKU or ID.";
          }

          const result = items.map((i: any) => ({
             id: i.id,
             sku: i.sku,
             stocked_quantity: i.location_levels?.reduce((acc: number, l: any) => acc + l.stocked_quantity, 0) || 0,
             reserved_quantity: i.location_levels?.reduce((acc: number, l: any) => acc + l.reserved_quantity, 0) || 0,
             levels: i.location_levels
          }));

          return JSON.stringify(result);
        } catch (e) {
          return `Error fetching inventory: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_get_inventory",
        description: "Get inventory details (stock levels) for a product SKU or Inventory Item ID.",
        schema: z.object({
          sku_or_id: z.string().describe("Product SKU or Inventory Item ID"),
        }),
      }
    ),
    tool(
      async ({ inventory_item_id, location_id, quantity_change }: { inventory_item_id: string; location_id: string; quantity_change: number }) => {
        try {
          const inventoryService: InventoryService = container.resolve(Modules.INVENTORY);

          // Check if level exists
          const [levels] = await inventoryService.listInventoryLevels({
            inventory_item_id,
            location_id
          });

          const currentLevel = levels[0];

          if (!currentLevel) {
            // Create level if it doesn't exist (assuming location is valid)
            await inventoryService.createInventoryLevels([{
              inventory_item_id,
              location_id,
              stocked_quantity: quantity_change > 0 ? quantity_change : 0
            }]);
            return `Created new inventory level with ${quantity_change} items.`;
          }

          const newQuantity = (currentLevel.stocked_quantity || 0) + quantity_change;

          await inventoryService.updateInventoryLevels([{
            inventory_item_id,
            location_id,
            stocked_quantity: newQuantity
          }]);

          return `Inventory updated. New quantity: ${newQuantity}`;
        } catch (e) {
          return `Error updating inventory: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_update_inventory",
        description: "Adjust stocked quantity for an inventory item at a specific location.",
        schema: z.object({
          inventory_item_id: z.string(),
          location_id: z.string(),
          quantity_change: z.number().describe("Positive to add stock, negative to reduce."),
        }),
      }
    ),
    tool(
      async ({ threshold = 10 }: { threshold?: number }) => {
        try {
           const inventoryService: InventoryService = container.resolve(Modules.INVENTORY);
           // Note: Efficient filtering usually requires DB-level queries not always exposed in basic Service APIs efficiently without specific filters.
           // We will fetch a batch and filter in memory for this "Agent" tool proof-of-concept.
           const [items] = await inventoryService.listInventoryItems({}, {
             relations: ["location_levels"],
             take: 100
           });

           const lowStock = items.filter((i: any) => {
             const totalStock = i.location_levels?.reduce((acc: number, l: any) => acc + l.stocked_quantity, 0) || 0;
             return totalStock < threshold;
           }).map((i: any) => ({
             id: i.id,
             sku: i.sku,
             total_stock: i.location_levels?.reduce((acc: number, l: any) => acc + l.stocked_quantity, 0) || 0
           }));

           return JSON.stringify(lowStock);
        } catch (e) {
          return `Error checking low stock: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_low_stock_alerts",
        description: "List inventory items where total stock is below a threshold.",
        schema: z.object({
          threshold: z.number().optional().default(10),
        }),
      }
    )
  ];
}
