import { getAdminAnalyticsTools } from "./analytics.js";
import { getAdminInventoryTools } from "./inventory.js";
import { getAdminOrderTools } from "./orders.js";
import { getAdminProductTools } from "./products.js";

import type { MedusaContainer } from "@medusajs/medusa";

export function getAdminTools(container: MedusaContainer) {
  return [
    ...getAdminProductTools(container),
    ...getAdminInventoryTools(container),
    ...getAdminOrderTools(container),
    ...getAdminAnalyticsTools(container),
  ];
}
