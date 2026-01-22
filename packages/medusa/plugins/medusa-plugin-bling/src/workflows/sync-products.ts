import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { fetchBlingProductsStep } from "./steps/fetch-bling-products-step.js";
import { updateInventoryStep } from "./steps/update-inventory-step.js";
import { upsertMedusaProductsStep } from "./steps/upsert-medusa-products-step.js";

export const syncProductsFromBlingWorkflow = createWorkflow(
  "sync-products-from-bling",
  () => {
    // 1. Fetch
    const products = fetchBlingProductsStep();

    // 2. Upsert Products (Definitions)
    const productResult = upsertMedusaProductsStep({ products });

    // 3. Update Inventory (Stock Levels)
    const inventoryResult = updateInventoryStep({ products });

    return new WorkflowResponse({
      products_synced: productResult,
      inventory_synced: inventoryResult,
    });
  },
);
