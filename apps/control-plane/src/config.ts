import { type BoundSecret, resolveSecret } from "@vendin/utils";

import type { Logger } from "./utils/logger";

export interface Environment {
  DATABASE_URL?: BoundSecret;
  NEON_API_KEY?: BoundSecret;
  NEON_PROJECT_ID?: BoundSecret;
  ADMIN_API_KEY?: BoundSecret;
  POSTHOG_API_KEY?: BoundSecret;
  POSTHOG_HOST?: string;
  UPSTASH_REDIS_URL?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS_PART_1?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS_PART_2?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS_PART_3?: BoundSecret;
  GEMINI_API_KEY?: BoundSecret;
  CLOUDFLARE_API_TOKEN?: BoundSecret;
  CLOUDFLARE_ZONE_ID?: BoundSecret;
  CLOUDRUN_SERVICE_ACCOUNT?: BoundSecret;
  TENANT_BASE_DOMAIN: string;
  STOREFRONT_HOSTNAME: string;
  NODE_ENV?: string;
  LOG_LEVEL?: string;
  ALLOWED_ORIGINS?: string;
  GCP_PROJECT_ID?: string;
  GCP_REGION?: string;
  TENANT_IMAGE_TAG?: string;
}

export interface ValidationConfig {
  logger: Logger;
  databaseUrl?: string | undefined;
  adminApiKey?: string | undefined;
  nodeEnvironment?: string | undefined;
  upstashRedisUrl?: string | undefined;
  neonApiKey?: string | undefined;
  neonProjectId?: string | undefined;
  gcpProjectId?: string | undefined;
  gcpRegion?: string | undefined;
  tenantImageTag?: string | undefined;
  googleApplicationCredentials?: string | undefined;
  cloudRunServiceAccount?: string | undefined;
  geminiApiKey?: string | undefined;
  cloudflareApiToken?: string | undefined;
  cloudflareZoneId?: string | undefined;
  tenantBaseDomain?: string | undefined;
  storefrontHostname?: string | undefined;
}

export function validateConfiguration(
  config: ValidationConfig,
): Response | undefined {
  const { logger, databaseUrl, upstashRedisUrl, nodeEnvironment } = config;

  if (!databaseUrl) {
    logger.error("DATABASE_URL is required but was not configured");
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: "DATABASE_URL is missing",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!upstashRedisUrl) {
    logger.error("UPSTASH_REDIS_URL is required but was not configured");
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: "UPSTASH_REDIS_URL is missing",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!config.tenantBaseDomain) {
    logger.error("TENANT_BASE_DOMAIN is required but was not configured");
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: "TENANT_BASE_DOMAIN is missing",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!config.storefrontHostname) {
    logger.error("STOREFRONT_HOSTNAME is required but was not configured");
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: "STOREFRONT_HOSTNAME is missing",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (nodeEnvironment === "production") {
    return validateProductionConfiguration(config);
  }

  return undefined;
}

function validateProductionConfiguration(
  config: ValidationConfig,
): Response | undefined {
  const {
    logger,
    adminApiKey,
    neonApiKey,
    neonProjectId,
    gcpProjectId,
    gcpRegion,
    tenantImageTag,
    googleApplicationCredentials,
    cloudRunServiceAccount,
    geminiApiKey,
    cloudflareApiToken,
    cloudflareZoneId,
  } = config;

  if (!adminApiKey) {
    logger.error(
      "ADMIN_API_KEY is required in production but was not configured",
    );
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: "ADMIN_API_KEY is missing",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const requiredInProduction = {
    NEON_API_KEY: neonApiKey,
    NEON_PROJECT_ID: neonProjectId,
    GCP_PROJECT_ID: gcpProjectId,
    GCP_REGION: gcpRegion,
    TENANT_IMAGE_TAG: tenantImageTag,
    GOOGLE_APPLICATION_CREDENTIALS: googleApplicationCredentials,
    CLOUDRUN_SERVICE_ACCOUNT: cloudRunServiceAccount,
    GEMINI_API_KEY: geminiApiKey,
    CLOUDFLARE_API_TOKEN: cloudflareApiToken,
    CLOUDFLARE_ZONE_ID: cloudflareZoneId,
  };

  const missingKeys = Object.entries(requiredInProduction)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    logger.error(
      { missingVariables: missingKeys },
      "Critical infrastructure keys are missing in production",
    );
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: `Critical keys missing (${missingKeys.join(", ")})`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return undefined;
}

export async function resolveEnvironmentSecrets(environment: Environment) {
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
    cloudRunServiceAccount,
  ] = await Promise.all([
    resolveSecret(environment.DATABASE_URL),
    resolveSecret(environment.NEON_API_KEY),
    resolveSecret(environment.NEON_PROJECT_ID),
    resolveSecret(environment.ADMIN_API_KEY),
    resolveSecret(environment.POSTHOG_API_KEY),
    resolveSecret(environment.UPSTASH_REDIS_URL),
    resolveSecret(environment.GOOGLE_APPLICATION_CREDENTIALS),
    resolveSecret(environment.GOOGLE_APPLICATION_CREDENTIALS_PART_1),
    resolveSecret(environment.GOOGLE_APPLICATION_CREDENTIALS_PART_2),
    resolveSecret(environment.GOOGLE_APPLICATION_CREDENTIALS_PART_3),
    resolveSecret(environment.GEMINI_API_KEY),
    resolveSecret(environment.CLOUDFLARE_API_TOKEN),
    resolveSecret(environment.CLOUDFLARE_ZONE_ID),
    resolveSecret(environment.CLOUDRUN_SERVICE_ACCOUNT),
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
    cloudRunServiceAccount,
    tenantBaseDomain: environment.TENANT_BASE_DOMAIN,
    storefrontHostname: environment.STOREFRONT_HOSTNAME,
  };
}
