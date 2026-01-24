import { logger } from "@vendin/utils/logger";

import type { Tenant } from "./types";

function getSettings() {
  return {
    CONTROL_PLANE_URL: process.env.CONTROL_PLANE_API_URL,
    API_KEY: process.env.CONTROL_PLANE_API_KEY,
    ENABLE_TENANT_CACHE:
      process.env.ENABLE_TENANT_CACHE === "true" ||
      process.env.ENABLE_TENANT_CACHE === "1",
    TENANT_CACHE_TTL: process.env.TENANT_CACHE_TTL
      ? Number.parseInt(process.env.TENANT_CACHE_TTL, 10)
      : 300,
  };
}

/**
 * Shared helper function to fetch tenant data from Control Plane API.
 * Centralizes API call configuration, error handling, and logging.
 */
async function fetchTenant(
  url: string,
  logContext: Record<string, string>,
): Promise<Tenant | null> {
  const { CONTROL_PLANE_URL, API_KEY, ENABLE_TENANT_CACHE, TENANT_CACHE_TTL } =
    getSettings();

  if (!CONTROL_PLANE_URL || !API_KEY) {
    logger.error({
      msg: "Control Plane configuration missing",
      controlPlaneUrl: !!CONTROL_PLANE_URL,
      hasApiKey: !!API_KEY,
    });
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      ...(ENABLE_TENANT_CACHE && { next: { revalidate: TENANT_CACHE_TTL } }),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      logger.error({
        msg: "Failed to fetch tenant",
        ...logContext,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    return response.json();
  } catch (error) {
    logger.error({
      msg: "Error fetching tenant",
      ...logContext,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function fetchTenantBySubdomain(
  subdomain: string,
): Promise<Tenant | null> {
  const { CONTROL_PLANE_URL } = getSettings();
  const url = `${CONTROL_PLANE_URL}/api/tenants/lookup?subdomain=${subdomain}`;
  return fetchTenant(url, { subdomain });
}

export function fetchTenantById(id: string): Promise<Tenant | null> {
  const { CONTROL_PLANE_URL } = getSettings();
  const url = `${CONTROL_PLANE_URL}/api/tenants/${id}`;
  return fetchTenant(url, { tenantId: id });
}
