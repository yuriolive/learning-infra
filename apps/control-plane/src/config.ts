import type { Logger } from "./utils/logger";

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
  CLOUD_RUN_SERVICE_ACCOUNT?: BoundSecret;
  GEMINI_API_KEY?: BoundSecret;
}

function resolveSecret(
  secret: BoundSecret | undefined,
): Promise<string | undefined> {
  if (typeof secret === "object" && secret !== null) {
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
    cloudRunServiceAccount,
    geminiApiKey,
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
    resolveSecret(environment.CLOUD_RUN_SERVICE_ACCOUNT),
    resolveSecret(environment.GEMINI_API_KEY),
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
    cloudRunServiceAccount,
    geminiApiKey,
  };
}

function createErrorResponse(
  message: string,
  error = "Configuration Error",
): Response {
  return new Response(
    JSON.stringify({
      error,
      message,
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}

// Helper to validate production-specific configuration to reduce complexity
function validateProductionConfig(
  logger: Logger,
  adminApiKey: string | undefined,
  neonApiKey?: string,
  neonProjectId?: string,
  gcpProjectId?: string,
  gcpRegion?: string,
  tenantImageTag?: string,
  googleApplicationCredentials?: string,
  cloudRunServiceAccount?: string,
  geminiApiKey?: string,
): Response | undefined {
  if (!adminApiKey) {
    logger.error(
      "ADMIN_API_KEY is required in production but was not configured",
    );
    return createErrorResponse("Service is not properly configured");
  }

  const requiredVariables = {
    NEON_API_KEY: neonApiKey,
    NEON_PROJECT_ID: neonProjectId,
    GCP_PROJECT_ID: gcpProjectId,
    GCP_REGION: gcpRegion,
    TENANT_IMAGE_TAG: tenantImageTag,
    GOOGLE_APPLICATION_CREDENTIALS: googleApplicationCredentials,
    CLOUD_RUN_SERVICE_ACCOUNT: cloudRunServiceAccount,
    GEMINI_API_KEY: geminiApiKey,
  };

  const missingVariables = Object.entries(requiredVariables)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVariables.length > 0) {
    logger.error(
      { missingVariables },
      "Critical infrastructure keys are missing in production",
    );
    return createErrorResponse(
      `Missing infrastructure configuration: ${missingVariables.join(", ")}`,
    );
  }

  return undefined;
}

export function validateConfiguration(
  logger: Logger,
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
  cloudRunServiceAccount?: string,
  geminiApiKey?: string,
): Response | undefined {
  if (!databaseUrl) {
    logger.error("DATABASE_URL is required but was not configured");
    return createErrorResponse("Database configuration is missing");
  }

  if (!upstashRedisUrl) {
    logger.error("UPSTASH_REDIS_URL is required but was not configured");
    return createErrorResponse("Redis configuration is missing");
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
      cloudRunServiceAccount,
      geminiApiKey,
    );
  }

  return undefined;
}
