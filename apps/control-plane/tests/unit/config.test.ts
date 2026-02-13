import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import {
  validateConfiguration,
  resolveEnvironmentSecrets,
  type Environment,
} from "../../src/config";

import type { createLogger } from "@vendin/logger";

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
    expect.objectContaining({
      message: `Critical keys missing (${missingVariables.join(", ")})`,
    }),
  );
};

describe("validateConfiguration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return undefined provided valid configuration", () => {
    const result = validateConfiguration({
      logger: mockLogger,
      databaseUrl: "postgres://localhost:5432/db",
      adminApiKey: "admin-api-key",
      nodeEnvironment: "production",
      upstashRedisUrl: "redis://localhost:6379",
      neonApiKey: "neon-api-key",
      neonProjectId: "neon-project-id",
      gcpProjectId: "gcp-project-id",
      gcpRegion: "gcp-region",
      tenantImageTag: "tenant-image-tag",
      googleApplicationCredentials: "google-app-creds",
      cloudRunServiceAccount: "mock-sa",
      geminiApiKey: "gemini-api-key",
      cloudflareApiToken: "cf-token",
      cloudflareZoneId: "cf-zone",
      tenantBaseDomain: "vendin.store",
      storefrontHostname: "storefront.vendin.store",
    });
    expect(result).toBeUndefined();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("should return 500 Response if DATABASE_URL is missing", async () => {
    const result = validateConfiguration({
      logger: mockLogger,
      databaseUrl: undefined,
      adminApiKey: "admin-api-key",
      nodeEnvironment: "production",
      upstashRedisUrl: "redis://localhost:6379",
      neonApiKey: "neon-api-key",
      neonProjectId: "neon-project-id",
      gcpProjectId: "gcp-project-id",
      gcpRegion: "gcp-region",
      tenantImageTag: "tenant-image-tag",
      googleApplicationCredentials: "google-app-creds",
      cloudRunServiceAccount: "sa",
      geminiApiKey: "gemini-api-key",
      cloudflareApiToken: undefined,
      cloudflareZoneId: undefined,
      tenantBaseDomain: "vendin.store",
      storefrontHostname: "storefront.vendin.store",
    });

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "DATABASE_URL is required but was not configured",
    );
    const body = await result?.json();
    expect(body).toEqual({
      error: "Configuration Error",
      message: "DATABASE_URL is missing",
    });
  });

  it("should return 500 Response if UPSTASH_REDIS_URL is missing", async () => {
    const result = validateConfiguration({
      logger: mockLogger,
      databaseUrl: "postgres://localhost:5432/db",
      adminApiKey: "admin-api-key",
      nodeEnvironment: "production",
      upstashRedisUrl: undefined, // upstashRedisUrl missing
      neonApiKey: "neon-api-key",
      neonProjectId: "neon-project-id",
      gcpProjectId: "gcp-project-id",
      gcpRegion: "gcp-region",
      tenantImageTag: "tenant-image-tag",
      googleApplicationCredentials: "google-app-creds",
      cloudRunServiceAccount: "sa",
      geminiApiKey: "gemini-api-key",
      cloudflareApiToken: undefined,
      cloudflareZoneId: undefined,
      tenantBaseDomain: "vendin.store",
      storefrontHostname: "storefront.vendin.store",
    });

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "UPSTASH_REDIS_URL is required but was not configured",
    );
    const body = await result?.json();
    expect(body).toEqual({
      error: "Configuration Error",
      message: "UPSTASH_REDIS_URL is missing",
    });
  });

  it("should return 500 Response if NODE_ENV is production and ADMIN_API_KEY is missing", async () => {
    const result = validateConfiguration({
      logger: mockLogger,
      databaseUrl: "postgres://localhost:5432/db",
      adminApiKey: undefined, // adminApiKey missing
      nodeEnvironment: "production",
      upstashRedisUrl: "redis://localhost:6379",
      neonApiKey: "neon-api-key",
      neonProjectId: "neon-project-id",
      gcpProjectId: "gcp-project-id",
      gcpRegion: "gcp-region",
      tenantImageTag: "tenant-image-tag",
      googleApplicationCredentials: "google-app-creds",
      cloudRunServiceAccount: "sa",
      geminiApiKey: "gemini-api-key",
      cloudflareApiToken: undefined,
      cloudflareZoneId: undefined,
      tenantBaseDomain: "vendin.store",
      storefrontHostname: "storefront.vendin.store",
    });

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "ADMIN_API_KEY is required in production but was not configured",
    );
    const body = await result?.json();
    expect(body).toEqual({
      error: "Configuration Error",
      message: "ADMIN_API_KEY is missing",
    });
  });

  it("should return undefined if ADMIN_API_KEY is missing but NODE_ENV is not production", () => {
    const result = validateConfiguration({
      logger: mockLogger,
      databaseUrl: "postgres://localhost:5432/db",
      adminApiKey: undefined,
      nodeEnvironment: "development",
      upstashRedisUrl: "redis://localhost:6379",
      neonApiKey: undefined,
      neonProjectId: undefined,
      gcpProjectId: undefined,
      gcpRegion: undefined,
      tenantImageTag: undefined,
      googleApplicationCredentials: undefined,
      cloudRunServiceAccount: undefined,
      geminiApiKey: undefined,
      cloudflareApiToken: undefined,
      cloudflareZoneId: undefined,
      tenantBaseDomain: "vendin.store",
      storefrontHostname: "storefront.vendin.store",
    });

    expect(result).toBeUndefined();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("should return 500 Response if NEON_API_KEY is missing in production", () => {
    const result = validateConfiguration({
      logger: mockLogger,
      databaseUrl: "postgres://localhost:5432/db",
      adminApiKey: "admin-api-key",
      nodeEnvironment: "production",
      upstashRedisUrl: "redis://localhost:6379",
      neonApiKey: undefined, // neonApiKey missing
      neonProjectId: "neon-project-id",
      gcpProjectId: "gcp-project-id",
      gcpRegion: "gcp-region",
      tenantImageTag: "tenant-image-tag",
      googleApplicationCredentials: "google-app-creds",
      cloudRunServiceAccount: "sa",
      geminiApiKey: "gemini-api-key",
      cloudflareApiToken: undefined,
      cloudflareZoneId: undefined,
      tenantBaseDomain: "vendin.store",
      storefrontHostname: "storefront.vendin.store",
    });

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);

    assertCriticalKeysMissing([
      "NEON_API_KEY",
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ZONE_ID",
    ]);
  });

  it("should return 500 Response if multiple critical keys are missing in production", () => {
    const result = validateConfiguration({
      logger: mockLogger,
      databaseUrl: "postgres://localhost:5432/db",
      adminApiKey: "admin-api-key",
      nodeEnvironment: "production",
      upstashRedisUrl: "redis://localhost:6379",
      neonApiKey: "neon-api-key",
      neonProjectId: undefined, // neonProjectId missing
      gcpProjectId: undefined, // gcpProjectId missing
      gcpRegion: "gcp-region",
      tenantImageTag: "tenant-image-tag",
      googleApplicationCredentials: "google-app-creds",
      cloudRunServiceAccount: "sa",
      geminiApiKey: "gemini-api-key",
      cloudflareApiToken: undefined,
      cloudflareZoneId: undefined,
      tenantBaseDomain: "vendin.store",
      storefrontHostname: "storefront.vendin.store",
    });

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);

    assertCriticalKeysMissing([
      "NEON_PROJECT_ID",
      "GCP_PROJECT_ID",
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ZONE_ID",
    ]);
  });
  it("should return 500 Response if TENANT_BASE_DOMAIN is missing", async () => {
    const result = validateConfiguration({
      logger: mockLogger,
      databaseUrl: "postgres://localhost:5432/db",
      adminApiKey: "admin-api-key",
      nodeEnvironment: "production",
      upstashRedisUrl: "redis://localhost:6379",
      neonApiKey: "neon-api-key",
      neonProjectId: "neon-project-id",
      gcpProjectId: "gcp-project-id",
      gcpRegion: "gcp-region",
      tenantImageTag: "tenant-image-tag",
      googleApplicationCredentials: "google-app-creds",
      cloudRunServiceAccount: "sa",
      geminiApiKey: "gemini-api-key",
      cloudflareApiToken: "cf-token",
      cloudflareZoneId: "cf-zone",
      tenantBaseDomain: undefined, // tenantBaseDomain missing
      storefrontHostname: "storefront.vendin.store",
    });

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "TENANT_BASE_DOMAIN is required but was not configured",
    );
    const body = await result?.json();
    expect(body).toEqual({
      error: "Configuration Error",
      message: "TENANT_BASE_DOMAIN is missing",
    });
  });

  it("should return 500 Response if STOREFRONT_HOSTNAME is missing", async () => {
    const result = validateConfiguration({
      logger: mockLogger,
      databaseUrl: "postgres://localhost:5432/db",
      adminApiKey: "admin-api-key",
      nodeEnvironment: "production",
      upstashRedisUrl: "redis://localhost:6379",
      neonApiKey: "neon-api-key",
      neonProjectId: "neon-project-id",
      gcpProjectId: "gcp-project-id",
      gcpRegion: "gcp-region",
      tenantImageTag: "tenant-image-tag",
      googleApplicationCredentials: "google-app-creds",
      cloudRunServiceAccount: "sa",
      geminiApiKey: "gemini-api-key",
      cloudflareApiToken: "cf-token",
      cloudflareZoneId: "cf-zone",
      tenantBaseDomain: "vendin.store",
      storefrontHostname: undefined,
    });

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "STOREFRONT_HOSTNAME is required but was not configured",
    );
    const body = await result?.json();
    expect(body).toEqual({
      error: "Configuration Error",
      message: "STOREFRONT_HOSTNAME is missing",
    });
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
      CLOUDRUN_SERVICE_ACCOUNT: "service-account",
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
      cloudRunServiceAccount: "service-account",
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
