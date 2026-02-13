import { type BoundSecret, resolveSecret } from "@vendin/utils";

import type { Logger } from "./utils/logger";

export interface Environment {
  DATABASE_URL?: BoundSecret;
  NEON_API_KEY?: BoundSecret;
  NEON_PROJECT_ID?: BoundSecret;
  ADMIN_API_KEY?: BoundSecret;
  POSTHOG_API_KEY?: BoundSecret;
  UPSTASH_REDIS_URL?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS_PART_1?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS_PART_2?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS_PART_3?: BoundSecret;
  GEMINI_API_KEY?: BoundSecret;
  CLOUDFLARE_API_TOKEN?: BoundSecret;
  CLOUDFLARE_ZONE_ID?: BoundSecret;
  CLOUDRUN_SERVICE_ACCOUNT?: string;
  TENANT_BASE_DOMAIN: string;
  STOREFRONT_HOSTNAME: string;
}

export function validateConfiguration(
  logger: Logger,
  databaseUrl: string | undefined,
  adminApiKey: string | undefined,
  nodeEnv: string | undefined,
  upstashRedisUrl: string | undefined,
  neonApiKey: string | undefined,
  neonProjectId: string | undefined,
  gcpProjectId: string | undefined,
  gcpRegion: string | undefined,
  tenantImageTag: string | undefined,
  googleApplicationCredentials: string | undefined,
  cloudRunServiceAccount: string | undefined,
  geminiApiKey: string | undefined,
  cloudflareApiToken: string | undefined,
  cloudflareZoneId: string | undefined,
  tenantBaseDomain: string | undefined,
  storefrontHostname: string | undefined,
): Response | undefined {
  if (!databaseUrl) {
    logger.error("DATABASE_URL is required but was not configured");
    return new Response("Configuration Error: DATABASE_URL is missing", {
      status: 500,
    });
  }

  if (!upstashRedisUrl) {
    logger.error("UPSTASH_REDIS_URL is required but was not configured");
    return new Response("Configuration Error: UPSTASH_REDIS_URL is missing", {
      status: 500,
    });
  }

  if (nodeEnv === "production" && !adminApiKey) {
    logger.error(
      "ADMIN_API_KEY is required in production but was not configured",
    );
    return new Response("Configuration Error: ADMIN_API_KEY is missing", {
      status: 500,
    });
  }

  if (nodeEnv === "production") {
    const missingKeys = [];
    if (!neonApiKey) missingKeys.push("NEON_API_KEY");
    if (!neonProjectId) missingKeys.push("NEON_PROJECT_ID");
    if (!gcpProjectId) missingKeys.push("GCP_PROJECT_ID");
    if (!gcpRegion) missingKeys.push("GCP_REGION");
    if (!tenantImageTag) missingKeys.push("TENANT_IMAGE_TAG");
    if (!googleApplicationCredentials) {
      missingKeys.push("GOOGLE_APPLICATION_CREDENTIALS");
    }
    if (!geminiApiKey) missingKeys.push("GEMINI_API_KEY");
    if (!cloudflareApiToken) missingKeys.push("CLOUDFLARE_API_TOKEN");
    if (!cloudflareZoneId) missingKeys.push("CLOUDFLARE_ZONE_ID");

    if (missingKeys.length > 0) {
      logger.error({ missingVariables: missingKeys }, "Critical infrastructure keys are missing in production");
      return new Response(
        `Configuration Error: Critical keys missing (${missingKeys.join(", ")})`,
        { status: 500 },
      );
    }
  }

  return undefined;
}

export async function resolveEnvironmentSecrets(env: Environment) {
  const [
    databaseUrl,
    neonApiKey,
    neonProjectId,
    adminApiKey,
    postHogApiKey,
    upstashRedisUrl,
    googleApplicationCredentialsFull,
    googleApplicationCredentialsPart1,
    googleApplicationCredentialsPart2,
    googleApplicationCredentialsPart3,
    geminiApiKey,
    cloudflareApiToken,
    cloudflareZoneId,
  ] = await Promise.all([
    resolveSecret(env.DATABASE_URL),
    resolveSecret(env.NEON_API_KEY),
    resolveSecret(env.NEON_PROJECT_ID),
    resolveSecret(env.ADMIN_API_KEY),
    resolveSecret(env.POSTHOG_API_KEY),
    resolveSecret(env.UPSTASH_REDIS_URL),
    resolveSecret(env.GOOGLE_APPLICATION_CREDENTIALS),
    resolveSecret(env.GOOGLE_APPLICATION_CREDENTIALS_PART_1),
    resolveSecret(env.GOOGLE_APPLICATION_CREDENTIALS_PART_2),
    resolveSecret(env.GOOGLE_APPLICATION_CREDENTIALS_PART_3),
    resolveSecret(env.GEMINI_API_KEY),
    resolveSecret(env.CLOUDFLARE_API_TOKEN),
    resolveSecret(env.CLOUDFLARE_ZONE_ID),
  ]);

  let googleApplicationCredentials = googleApplicationCredentialsFull;
  if (
    !googleApplicationCredentials &&
    googleApplicationCredentialsPart1 &&
    googleApplicationCredentialsPart2 &&
    googleApplicationCredentialsPart3
  ) {
    googleApplicationCredentials = `${googleApplicationCredentialsPart1}${googleApplicationCredentialsPart2}${googleApplicationCredentialsPart3}`;
  }

  return {
    databaseUrl,
    neonApiKey,
    neonProjectId,
    adminApiKey,
    postHogApiKey,
    upstashRedisUrl,
    googleApplicationCredentials,
    geminiApiKey,
    cloudflareApiToken,
    cloudflareZoneId,
    cloudRunServiceAccount: env.CLOUDRUN_SERVICE_ACCOUNT,
    tenantBaseDomain: env.TENANT_BASE_DOMAIN,
    storefrontHostname: env.STOREFRONT_HOSTNAME,
  };
}
