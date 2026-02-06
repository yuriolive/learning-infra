import { cache } from "@vendin/cache";
import { createCloudflareLogger } from "@vendin/logger";

import type { Tenant, TenantApiResponse } from "../types/tenant";

const TENANT_CACHE_TTL = 60; // 60 seconds

const logger = createCloudflareLogger({ nodeEnv: process.env.NODE_ENV });

/**
 * Maps the API response to the Storefront Tenant type.
 */
function mapTenantData(
  tenantData: TenantApiResponse,
  hostname: string,
): Tenant {
  const metadata = tenantData.metadata;

  return {
    id: tenantData.id,
    name: tenantData.name,
    subdomain: tenantData.subdomain || hostname,
    backendUrl: tenantData.apiUrl || "",
    theme: metadata?.theme || {
      primaryColor: "#000000",
      fontFamily: "Inter",
      logoUrl: "",
    },
  };
}

export async function resolveTenant(hostname: string): Promise<Tenant | null> {
  // Local development mock based on environment variable
  if (process.env.NODE_ENV === "development" && process.env.LOCAL_TENANT_ID) {
    return {
      id: process.env.LOCAL_TENANT_ID,
      name: "Local Test Tenant",
      subdomain: "localhost",
      backendUrl: "http://localhost:3000",
      theme: {
        primaryColor: "#7c3aed",
        fontFamily: "Inter",
        logoUrl: "",
      },
    };
  }

  const cacheKey = `tenant-resolution:${hostname}`;

  // 1. Cache Lookup
  const cachedTenant = await cache.get<Tenant>(cacheKey);
  if (cachedTenant) {
    return cachedTenant;
  }

  // 2. Source Fetch
  const controlPlaneUrl = process.env.CONTROL_PLANE_API_URL;

  if (!controlPlaneUrl) {
    logger.error("CONTROL_PLANE_API_URL not defined");
    return null;
  }

  try {
    const response = await fetch(
      `${controlPlaneUrl}/api/tenants?subdomain=${encodeURIComponent(hostname)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 0 },
      },
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      logger.error(
        { status: response.status, statusText: response.statusText },
        "Failed to fetch tenant",
      );
      return null;
    }

    const tenants: TenantApiResponse | TenantApiResponse[] =
      await response.json();
    const tenantData: TenantApiResponse | null = Array.isArray(tenants)
      ? tenants[0]
      : tenants;

    if (!tenantData) return null;

    // Map to Storefront Tenant
    const tenant = mapTenantData(tenantData, hostname);

    // 3. Cache Update
    await cache.set(cacheKey, tenant, { ttlSeconds: TENANT_CACHE_TTL });

    return tenant;
  } catch (error) {
    logger.error({ error, hostname }, "Error resolving tenant");
    return null;
  }
}
