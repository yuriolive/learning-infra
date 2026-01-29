import { describe, it, expect, vi, beforeEach } from "vitest";

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
      undefined,
      undefined,
      undefined,
      undefined,
      "google-app-creds",
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
      undefined,
      undefined,
      "neon-api-key",
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
      undefined,
      "production",
      "redis://localhost:6379",
      "neon-api-key",
      "neon-project-id",
      "gcp-project-id",
      "gcp-region",
      "tenant-image-tag",
      "google-app-creds",
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
      // Optional vars can be undefined in dev
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
    );

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        missingVariables: ["NEON_API_KEY", "CLOUD_RUN_SERVICE_ACCOUNT"],
      }),
      "Critical infrastructure keys are missing in production",
    );
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
    );

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        missingVariables: [
          "NEON_PROJECT_ID",
          "GCP_PROJECT_ID",
          "CLOUD_RUN_SERVICE_ACCOUNT",
        ],
      }),
      "Critical infrastructure keys are missing in production",
    );
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
