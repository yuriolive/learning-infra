import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";
import { ProductSnapshot } from "../../modules/bling/utils/product-mapper.js";
import { InventoryItemDTO } from "@medusajs/types";

type UpdateInventoryStepInput = {
  products: ProductSnapshot[];
};

export const updateInventoryStep = createStep(
  "update-medusa-inventory",
  async (input: UpdateInventoryStepInput, { container }) => {
    const inventoryModule = container.resolve(Modules.INVENTORY);
    const { products } = input;

    const [locations] = await (inventoryModule as any).listStockLocations({}, { take: 1 });
    const defaultLocationId = locations?.[0]?.id;

    if (!defaultLocationId) {
        return new StepResponse({ updated: 0, message: "No stock location found" });
    }

    let updatedCount = 0;

    for (const p of products) {
        for (const v of p.variants) {
            if (!v.sku) continue;

            // Fix: Retrieve array correctly. listInventoryItems returns InventoryItemDTO[] in some versions or [items, count]
            // We'll treat it as standard list response which is usually [items, count] in V2 modules?
            // But previous errors suggested direct array.
            // Safer way:
            const itemsList = await inventoryModule.listInventoryItems({ sku: v.sku });

            // Normalize result
            const inventoryItems = Array.isArray(itemsList)
                ? (Array.isArray(itemsList[0]) ? itemsList[0] : itemsList) // Handle [items, count] or items[]
                : [];

            // inventoryItems is now any[] or InventoryItemDTO[]

            if (inventoryItems.length > 0) {
                const item = inventoryItems[0] as unknown as InventoryItemDTO;
                const totalStock = v.stock.reduce((acc: number, s: any) => acc + s.quantity, 0);

                const levelsList = await inventoryModule.listInventoryLevels({
                    inventory_item_id: item.id,
                    location_id: defaultLocationId
                });

                const levels = Array.isArray(levelsList)
                    ? (Array.isArray(levelsList[0]) ? levelsList[0] : levelsList)
                    : [];

                if (levels.length > 0) {
                     await (inventoryModule as any).updateInventoryLevels([
                        {
                            inventory_item_id: item.id,
                            location_id: defaultLocationId,
                            stocked_quantity: totalStock
                        }
                    ]);
                } else {
                     await inventoryModule.createInventoryLevels({
                        inventory_item_id: item.id,
                        location_id: defaultLocationId,
                        stocked_quantity: totalStock
                    });
                }

                updatedCount++;
            } else {
                const totalStock = v.stock.reduce((acc: number, s: any) => acc + s.quantity, 0);
                const item = await inventoryModule.createInventoryItems({
                    sku: v.sku,
                    title: p.name,
                    requires_shipping: true
                });

                await inventoryModule.createInventoryLevels({
                    inventory_item_id: item.id,
                    location_id: defaultLocationId,
                    stocked_quantity: totalStock
                });
                updatedCount++;
            }
        }
    }

    return new StepResponse({ updated: updatedCount });
  }
);
