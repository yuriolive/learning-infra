import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import {
  validateConfiguration,
  resolveEnvironmentSecrets,
  type Environment,
} from "../../src/config";

import type { createLogger } from "@vendin/utils";

// Mock logger
const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
} as unknown as ReturnType<typeof createLogger>;

const assertCriticalKeysMissing = (missingVariables: string[]) => {
  expect(mockLogger.error).toHaveBeenCalled();
  const calls = (mockLogger.error as Mock).mock.calls;
  expect(calls[0]![0]).toEqual(
    expect.objectContaining({
      missingVariables,
    }),
  );
  expect(calls[0]![1]).toBe(
    "Critical infrastructure keys are missing in production",
  );
};

describe("validateConfiguration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return undefined provided valid configuration", () => {
    const result = validateConfiguration(
      mockLogger,
      "postgres://localhost:5432/db",
      "admin-api-key",
      "production",
      "redis://localhost:6379",
      "neon-api-key",
      "neon-project-id",
      "gcp-project-id",
      "gcp-region",
      "tenant-image-tag",
      "google-app-creds",
      "mock-sa",
      "gemini-api-key",
      "cf-token",
      "cf-zone",
      "vendin.store",
      "storefront.vendin.store",
    );
    expect(result).toBeUndefined();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("should return 500 Response if DATABASE_URL is missing", () => {
    const result = validateConfiguration(
      mockLogger,
      undefined,
      "admin-api-key",
      "production",
      "redis://localhost:6379",
      "neon-api-key",
      "neon-project-id",
      "gcp-project-id",
      "gcp-region",
      "tenant-image-tag",
      "google-app-creds",
      "sa",
      "gemini-api-key",
      undefined,
      undefined,
      "vendin.store",
      "storefront.vendin.store",
    );

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "DATABASE_URL is required but was not configured",
    );
  });

  it("should return 500 Response if UPSTASH_REDIS_URL is missing", () => {
    const result = validateConfiguration(
      mockLogger,
      "postgres://localhost:5432/db",
      "admin-api-key",
      "production",
      undefined, // upstashRedisUrl missing
      "neon-api-key",
      "neon-project-id",
      "gcp-project-id",
      "gcp-region",
      "tenant-image-tag",
      "google-app-creds",
      "sa",
      "gemini-api-key",
      undefined,
      undefined,
      "vendin.store",
      "storefront.vendin.store",
    );

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "UPSTASH_REDIS_URL is required but was not configured",
    );
  });

  it("should return 500 Response if NODE_ENV is production and ADMIN_API_KEY is missing", () => {
    const result = validateConfiguration(
      mockLogger,
      "postgres://localhost:5432/db",
      undefined, // adminApiKey missing
      "production",
      "redis://localhost:6379",
      "neon-api-key",
      "neon-project-id",
      "gcp-project-id",
      "gcp-region",
      "tenant-image-tag",
      "google-app-creds",
      "sa",
      "gemini-api-key",
      undefined,
      undefined,
      "vendin.store",
      "storefront.vendin.store",
    );

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "ADMIN_API_KEY is required in production but was not configured",
    );
  });

  it("should return undefined if ADMIN_API_KEY is missing but NODE_ENV is not production", () => {
    const result = validateConfiguration(
      mockLogger,
      "postgres://localhost:5432/db",
      undefined,
      "development",
      "redis://localhost:6379",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "vendin.store",
      "storefront.vendin.store",
    );

    expect(result).toBeUndefined();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("should return 500 Response if NEON_API_KEY is missing in production", () => {
    const result = validateConfiguration(
      mockLogger,
      "postgres://localhost:5432/db",
      "admin-api-key",
      "production",
      "redis://localhost:6379",
      undefined, // neonApiKey missing
      "neon-project-id",
      "gcp-project-id",
      "gcp-region",
      "tenant-image-tag",
      "google-app-creds",
      "sa",
      "gemini-api-key",
      undefined,
      undefined,
      "vendin.store",
      "storefront.vendin.store",
    );

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);

    assertCriticalKeysMissing([
      "NEON_API_KEY",
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ZONE_ID",
    ]);
  });

  it("should return 500 Response if multiple critical keys are missing in production", () => {
    const result = validateConfiguration(
      mockLogger,
      "postgres://localhost:5432/db",
      "admin-api-key",
      "production",
      "redis://localhost:6379",
      "neon-api-key",
      undefined, // neonProjectId missing
      undefined, // gcpProjectId missing
      "gcp-region",
      "tenant-image-tag",
      "google-app-creds",
      "sa",
      "gemini-api-key",
      undefined,
      undefined,
      "vendin.store",
      "storefront.vendin.store",
    );

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);

    assertCriticalKeysMissing([
      "NEON_PROJECT_ID",
      "GCP_PROJECT_ID",
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ZONE_ID",
    ]);
  });
});

describe("resolveEnvironmentSecrets", () => {
  it("should resolve all secrets when provided as strings", async () => {
    const environment: Environment = {
      DATABASE_URL: "postgres://db",
      NEON_API_KEY: "neon-key",
      NEON_PROJECT_ID: "neon-project",
      ADMIN_API_KEY: "admin-key",
      POSTHOG_API_KEY: "posthog-key",
      UPSTASH_REDIS_URL: "redis://upstash",
      GOOGLE_APPLICATION_CREDENTIALS: "full-creds",
      GEMINI_API_KEY: "gemini-key",
      CLOUDFLARE_API_TOKEN: "cf-token",
      CLOUDFLARE_ZONE_ID: "cf-zone",
      TENANT_BASE_DOMAIN: "vendin.store",
      STOREFRONT_HOSTNAME: "storefront.vendin.store",
    };

    const result = await resolveEnvironmentSecrets(environment);

    expect(result).toEqual({
      databaseUrl: "postgres://db",
      neonApiKey: "neon-key",
      neonProjectId: "neon-project",
      adminApiKey: "admin-key",
      postHogApiKey: "posthog-key",
      upstashRedisUrl: "redis://upstash",
      googleApplicationCredentials: "full-creds",
      geminiApiKey: "gemini-key",
      cloudflareApiToken: "cf-token",
      cloudflareZoneId: "cf-zone",
      cloudRunServiceAccount: undefined,
      tenantBaseDomain: "vendin.store",
      storefrontHostname: "storefront.vendin.store",
    });
  });

  it("should resolve secrets from SecretBinding objects", async () => {
    const mockBinding = { get: vi.fn().mockResolvedValue("resolved-secret") };
    const environment: Partial<Environment> = {
      DATABASE_URL: mockBinding,
    };

    const result = await resolveEnvironmentSecrets(environment as Environment);

    expect(result.databaseUrl).toBe("resolved-secret");
    expect(mockBinding.get).toHaveBeenCalled();
  });

  it("should assemble GOOGLE_APPLICATION_CREDENTIALS from parts if full is missing", async () => {
    const environment: Partial<Environment> = {
      DATABASE_URL: "db",
      GOOGLE_APPLICATION_CREDENTIALS_PART_1: "part1",
      GOOGLE_APPLICATION_CREDENTIALS_PART_2: "part2",
      GOOGLE_APPLICATION_CREDENTIALS_PART_3: "part3",
    };

    const result = await resolveEnvironmentSecrets(environment as Environment);

    expect(result.googleApplicationCredentials).toBe("part1part2part3");
  });

  it("should prioritize full GOOGLE_APPLICATION_CREDENTIALS over parts", async () => {
    const environment: Partial<Environment> = {
      DATABASE_URL: "db",
      GOOGLE_APPLICATION_CREDENTIALS: "full",
      GOOGLE_APPLICATION_CREDENTIALS_PART_1: "part1",
      GOOGLE_APPLICATION_CREDENTIALS_PART_2: "part2",
      GOOGLE_APPLICATION_CREDENTIALS_PART_3: "part3",
    };

    const result = await resolveEnvironmentSecrets(environment as Environment);

    expect(result.googleApplicationCredentials).toBe("full");
  });

  it("should leave googleApplicationCredentials undefined if parts are incomplete", async () => {
    const environment: Partial<Environment> = {
      DATABASE_URL: "db",
      GOOGLE_APPLICATION_CREDENTIALS_PART_1: "part1",
      GOOGLE_APPLICATION_CREDENTIALS_PART_2: "part2",
      // PART_3 is missing
    };

    const result = await resolveEnvironmentSecrets(environment as Environment);

    expect(result.googleApplicationCredentials).toBeUndefined();
  });
});
