import { logger } from "@vendin/utils/logger";

import type { Tenant } from "./types";

const CONTROL_PLANE_URL = process.env.CONTROL_PLANE_API_URL;
const API_KEY = process.env.CONTROL_PLANE_API_KEY;

// Cache configuration from environment variables
const ENABLE_TENANT_CACHE =
  process.env.ENABLE_TENANT_CACHE === "true" ||
  process.env.ENABLE_TENANT_CACHE === "1";
const TENANT_CACHE_TTL = process.env.TENANT_CACHE_TTL
  ? Number.parseInt(process.env.TENANT_CACHE_TTL, 10)
  : 300; // Default to 5 minutes

export async function fetchTenantBySubdomain(
  subdomain: string,
): Promise<Tenant | null> {
  if (!CONTROL_PLANE_URL || !API_KEY) {
    logger.error({
      msg: "Control Plane configuration missing",
      controlPlaneUrl: !!CONTROL_PLANE_URL,
      hasApiKey: !!API_KEY,
    });
    return null;
  }

  try {
    const response = await fetch(
      `${CONTROL_PLANE_URL}/api/tenants/lookup?subdomain=${subdomain}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
        ...(ENABLE_TENANT_CACHE && { next: { revalidate: TENANT_CACHE_TTL } }),
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      logger.error({
        msg: "Failed to fetch tenant by subdomain",
        subdomain,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    return response.json();
  } catch (error) {
    logger.error({
      msg: "Error fetching tenant by subdomain",
      subdomain,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function fetchTenantById(id: string): Promise<Tenant | null> {
  if (!CONTROL_PLANE_URL || !API_KEY) {
    logger.error({
      msg: "Control Plane configuration missing",
      controlPlaneUrl: !!CONTROL_PLANE_URL,
      hasApiKey: !!API_KEY,
    });
    return null;
  }

  try {
    const response = await fetch(`${CONTROL_PLANE_URL}/api/tenants/${id}`, {
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
        msg: "Failed to fetch tenant by ID",
        tenantId: id,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    return response.json();
  } catch (error) {
    logger.error({
      msg: "Error fetching tenant by ID",
      tenantId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
