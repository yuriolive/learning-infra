import { getAdminTools } from "./admin/index.js";
import { getCartTools } from "./cart.js";
import { getStoreTools } from "./products.js";

import type { MedusaContainer } from "@medusajs/medusa";

export function getToolsForRole(
  container: MedusaContainer,
  role: "admin" | "customer",
) {
  if (role === "admin") {
    return getAdminTools(container);
  }

  // Customer tools
  const storeTools = getStoreTools(container);
  const cartTools = getCartTools(container);

  return [...storeTools, ...cartTools];
}
