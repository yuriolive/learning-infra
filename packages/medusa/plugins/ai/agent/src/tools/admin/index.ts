import type { MedusaContainer } from "@medusajs/medusa";
import { getAdminProductTools } from "./products.js";
import { getAdminInventoryTools } from "./inventory.js";
import { getAdminOrderTools } from "./orders.js";
import { getAdminAnalyticsTools } from "./analytics.js";

export function getAdminTools(container: MedusaContainer) {
  return [
    ...getAdminProductTools(container),
    ...getAdminInventoryTools(container),
    ...getAdminOrderTools(container),
    ...getAdminAnalyticsTools(container),
  ];
}
