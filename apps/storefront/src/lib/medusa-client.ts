import Medusa from "@medusajs/js-sdk";

import { getTenantAuthToken } from "./auth.js";

const PROXY_URL = "/api/medusa";

/**
 * Returns a configured Medusa client.
 *
 * Client-Side:
 *   - Uses the Storefront Proxy (`/api/medusa`).
 *   - No manual auth needed (cookies/session handled by browser/proxy).
 *
 * Server-Side:
 *   - Requires `tenantUrl`.
 *   - Generates OIDC token for the backend.
 *   - Connects directly to the private Tenant Instance.
 */
export async function getMedusaClient(tenantUrl?: string) {
  // Client-side execution
  if (globalThis.window !== undefined) {
    return new Medusa({
      baseUrl: PROXY_URL,
      publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
    });
  }

  // Server-side execution
  if (!tenantUrl) {
    throw new Error(
      "getMedusaClient: tenantUrl is required when complying on the server.",
    );
  }

  // Generate OIDC Token for private access
  const authHeader = await getTenantAuthToken(tenantUrl);

  return new Medusa({
    baseUrl: tenantUrl,
    globalHeaders: {
      Authorization: authHeader,
    },
    // If you have a publishable key on server, inject it too
  });
}
