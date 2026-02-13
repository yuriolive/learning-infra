import { cache } from "@vendin/cache";
import { createCloudflareLogger } from "@vendin/logger";
import { type BoundSecret, resolveSecret } from "@vendin/utils";
import { cache as reactCache } from "react";

const logger = createCloudflareLogger({
  logLevel: "info",
  nodeEnv: process.env.NODE_ENV || "development",
});

export interface TenantMetadata {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  databaseUrl: string;
  apiUrl: string;
  backendUrl: string;
  acmeChallenge?: {
    token: string;
    response: string;
  };
  theme: {
    primaryColor: string;
    fontFamily: string;
    logoUrl: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Resolves the host from the request headers
 */
export function resolveHost(headers: Headers): string {
  const host = headers.get("host") || headers.get("x-forwarded-host") || "";
  // For local development with wrangler, sometimes host includes port
  return host.split(":")[0]?.toLowerCase() || "";
}

/**
 * Fetches tenant metadata from the control plane API.
 * This should be cached to avoid excessive API calls.
 */
const TENANT_CACHE_TTL_SECONDS = 300;

/**
 * Fetches tenant metadata from the control plane API.
 * This should be cached to avoid excessive API calls.
 */
export const resolveTenant = reactCache(async (host: string) => {
  if (!host) return null;

  // Cache key based on host
  const cacheKey = `tenant:${host}`;

  // Try to get from distributed cache first
  try {
    const cachedTenant = await cache.get<TenantMetadata>(cacheKey);
    if (cachedTenant) {
      return cachedTenant;
    }
  } catch (error) {
    logger.warn({ host, err: error }, "Failed to get tenant from cache");
  }

  // Restore mock tenant data for local development
  const mockTenant = getMockTenantForDevelopment(host);
  if (mockTenant) return mockTenant;

  // Resolve admin API key ensuring it handles Cloudflare SecretBinding
  const controlPlaneUrl = process.env.CONTROL_PLANE_API_URL;
  if (!controlPlaneUrl) {
    logger.error("CONTROL_PLANE_API_URL is not configured");
    return null;
  }

  const adminApiKey = await resolveAdminApiKey();
  if (!adminApiKey) return null;

  const tenant = await fetchTenantFromApi(controlPlaneUrl, host, adminApiKey);
  if (!tenant) return null;

  // Cache the result
  try {
    await cache.set(cacheKey, tenant, { ttlSeconds: TENANT_CACHE_TTL_SECONDS });
  } catch (error) {
    logger.warn({ host, err: error }, "Failed to set tenant in cache");
  }

  return tenant;
});

async function fetchTenantFromApi(
  controlPlaneUrl: string,
  host: string,
  adminApiKey: string,
): Promise<TenantMetadata | null> {
  try {
    const response = await fetch(
      `${controlPlaneUrl}/api/tenants/resolve?subdomain=${host}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminApiKey}`,
        },
        // Low timeout for tenant resolution to avoid blocking
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      logger.error(
        { status: response.status, host },
        "Failed to fetch tenant from control plane",
      );
      return null;
    }

    const tenantData = await response.json();
    const tenant = (
      Array.isArray(tenantData) ? tenantData[0] : tenantData
    ) as TenantMetadata;

    return tenant || null;
  } catch (error) {
    logger.error(
      { host, error },
      "Error resolving tenant from control plane API",
    );
    return null;
  }
}

function getMockTenantForDevelopment(host: string): TenantMetadata | null {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_TENANT_ID &&
    !process.env.CONTROL_PLANE_API_URL
  ) {
    logger.info("Using mock tenant data for local development");
    return {
      id: process.env.LOCAL_TENANT_ID,
      name: "Local Tenant",
      subdomain: host,
      status: "active",
      databaseUrl: "", // Not needed for storefront
      apiUrl: "http://localhost:9000",
      backendUrl: "http://localhost:9000",
      theme: {
        primaryColor: "#000000",
        fontFamily: "Inter",
        logoUrl: "",
      },
    } as TenantMetadata;
  }
  return null;
}

async function resolveAdminApiKey(): Promise<string | null> {
  const rawAdminApiKey = process.env.ADMIN_API_KEY;
  const adminApiKey = await resolveSecret(
    rawAdminApiKey as BoundSecret | undefined,
  );

  if (!adminApiKey) {
    logger.error(
      {
        error: "missing_env",
        var: "ADMIN_API_KEY",
        rawStatus: rawAdminApiKey ? typeof rawAdminApiKey : "missing",
        isObject: typeof rawAdminApiKey === "object" && rawAdminApiKey !== null,
      },
      "Environment variable ADMIN_API_KEY is missing or could not be resolved",
    );
    // In production, this is critical.
    if (process.env.NODE_ENV === "production") {
      return null;
    }
    // Return empty string for non-production if key is missing (to allow fetch to proceed if API allows it, or fail gracefully later)
    // However, existing logic returned null in production, but continued in dev?
    // The original logic:
    // if (!adminApiKey) { log... if (prod) return null; }
    // then fetch ... Authorization: `Bearer ${adminApiKey || ""}`
    return "";
  }
  return adminApiKey;
}
