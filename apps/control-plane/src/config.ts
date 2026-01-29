import type { createLogger } from "@vendin/utils/logger";

interface SecretBinding {
  get(): Promise<string>;
}

type BoundSecret = string | SecretBinding;

export interface Environment {
  DATABASE_URL: BoundSecret;
  LOG_LEVEL?: string;
  NODE_ENV?: string;
  NEON_API_KEY?: BoundSecret;
  NEON_PROJECT_ID?: BoundSecret;
  ADMIN_API_KEY?: BoundSecret;
  ALLOWED_ORIGINS?: string;
  POSTHOG_API_KEY?: BoundSecret;
  POSTHOG_HOST?: string;
  GCP_PROJECT_ID?: string;
  GCP_REGION?: string;
  TENANT_IMAGE_TAG?: string;
  UPSTASH_REDIS_URL?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS_PART_1?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS_PART_2?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS_PART_3?: BoundSecret;
}

function resolveSecret(
  secret: BoundSecret | undefined,
): Promise<string | undefined> {
  if (typeof secret === "object" && secret !== null && "get" in secret) {
    return secret.get();
  }
  return Promise.resolve(secret as string | undefined);
}

export async function resolveEnvironmentSecrets(environment: Environment) {
  const [
    databaseUrl,
    neonApiKey,
    neonProjectId,
    adminApiKey,
    postHogApiKey,
    upstashRedisUrl,
    googleAppCredsFull,
    googleAppCredsP1,
    googleAppCredsP2,
    googleAppCredsP3,
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
  ]);

  let googleApplicationCredentials = googleAppCredsFull;

  // If full credential is missing, try to assemble from parts
  if (
    !googleApplicationCredentials &&
    googleAppCredsP1 &&
    googleAppCredsP2 &&
    googleAppCredsP3
  ) {
    googleApplicationCredentials =
      googleAppCredsP1 + googleAppCredsP2 + googleAppCredsP3;
  }

  return {
    databaseUrl,
    neonApiKey,
    neonProjectId,
    adminApiKey,
    postHogApiKey,
    upstashRedisUrl,
    googleApplicationCredentials,
  };
}

// Helper to validate production-specific configuration to reduce complexity
function validateProductionConfig(
  logger: ReturnType<typeof createLogger>,
  adminApiKey: string | undefined,
  neonApiKey?: string,
  neonProjectId?: string,
  gcpProjectId?: string,
  gcpRegion?: string,
  tenantImageTag?: string,
  googleApplicationCredentials?: string,
): Response | undefined {
  if (!adminApiKey) {
    logger.error(
      "ADMIN_API_KEY is required in production but was not configured",
    );
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: "Service is not properly configured",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const missingVariables: string[] = [];
  if (!neonApiKey) missingVariables.push("NEON_API_KEY");
  if (!neonProjectId) missingVariables.push("NEON_PROJECT_ID");
  if (!gcpProjectId) missingVariables.push("GCP_PROJECT_ID");
  if (!gcpRegion) missingVariables.push("GCP_REGION");
  if (!tenantImageTag) missingVariables.push("TENANT_IMAGE_TAG");
  if (!googleApplicationCredentials)
    missingVariables.push("GOOGLE_APPLICATION_CREDENTIALS");

  if (missingVariables.length > 0) {
    logger.error(
      { missingVariables },
      "Critical infrastructure keys are missing in production",
    );
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: `Missing infrastructure configuration: ${missingVariables.join(", ")}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return undefined;
}

export function validateConfiguration(
  logger: ReturnType<typeof createLogger>,
  databaseUrl: string | undefined,
  adminApiKey: string | undefined,
  nodeEnvironment: string,
  upstashRedisUrl?: string,
  neonApiKey?: string,
  neonProjectId?: string,
  gcpProjectId?: string,
  gcpRegion?: string,
  tenantImageTag?: string,
  googleApplicationCredentials?: string,
): Response | undefined {
  if (!databaseUrl) {
    logger.error("DATABASE_URL is required but was not configured");
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: "Database configuration is missing",
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
        message: "Redis configuration is missing",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (nodeEnvironment === "production") {
    return validateProductionConfig(
      logger,
      adminApiKey,
      neonApiKey,
      neonProjectId,
      gcpProjectId,
      gcpRegion,
      tenantImageTag,
      googleApplicationCredentials,
    );
  }

  return undefined;
}
