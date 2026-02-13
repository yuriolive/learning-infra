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

  // Resolve admin API key ensuring it handles Cloudflare SecretBinding
  const controlPlaneUrl = process.env.CONTROL_PLANE_API_URL;
  if (!controlPlaneUrl) {
    logger.error("CONTROL_PLANE_API_URL is not configured");
    return null;
  }

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
  }

  try {
    const response = await fetch(
      `${controlPlaneUrl}/api/tenants/resolve?subdomain=${host}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminApiKey || ""}`,
        },
        // Low timeout for tenant resolution to avoid blocking
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      logger.error(
        {
          host,
          status: response.status,
          url: response.url,
          hasAdminApiKey: !!adminApiKey,
          adminApiKeyType: typeof adminApiKey,
        },
        "Failed to resolve tenant from control plane",
      );
      return null;
    }

    const tenant = (await response.json()) as TenantMetadata;

    // Cache the resolved tenant metadata for 5 minutes
    try {
      await cache.set(cacheKey, tenant, { ttlSeconds: 300 });
    } catch (error) {
      logger.warn({ host, err: error }, "Failed to set tenant in cache");
    }

    return tenant;
  } catch (error) {
    logger.error({ host, err: error }, "Error resolving tenant");
    return null;
  }
});
