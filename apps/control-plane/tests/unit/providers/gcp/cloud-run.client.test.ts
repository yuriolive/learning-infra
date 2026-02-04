import { createLogger } from "@vendin/logger";
import { GoogleAuth } from "google-auth-library";
import { run_v2 } from "googleapis";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import { CloudRunProvider } from "../../../../src/providers/gcp/cloud-run.client";

// Mock dependencies
vi.mock("google-auth-library");
vi.mock("googleapis", () => {
  return {
    run_v2: {
      Run: vi.fn(),
    },
  };
});

describe("CloudRunProvider", () => {
  let provider: CloudRunProvider;
  const mockLogger = createLogger({ logLevel: "silent" });

  // Fully mocked Run client structure
  const mockRunClient = {
    projects: {
      locations: {
        operations: {
          get: vi.fn(),
        },
        services: {
          get: vi.fn(),
          create: vi.fn(),
          delete: vi.fn(),
          getIamPolicy: vi.fn(),
          setIamPolicy: vi.fn(),
        },
        jobs: {
          create: vi.fn(),
          run: vi.fn(),
          executions: {
            get: vi.fn(),
          },
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the GoogleAuth constructor
    const GoogleAuthMock = vi.mocked(GoogleAuth);
    GoogleAuthMock.mockImplementation(
      () =>
        ({
          getClient: vi.fn(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as unknown as any,
    );

    // Mock the Run client constructor
    const RunMock = vi.mocked(run_v2.Run);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    RunMock.mockImplementation(() => mockRunClient as unknown as any);

    provider = new CloudRunProvider({
      projectId: "test-project",
      region: "test-region",
      tenantImageTag: "test-tag",
      logger: mockLogger,
      credentialsJson: "{}",
    });
  });

  describe("getOperation", () => {
    it("should log and re-throw error if API call fails", async () => {
      const error = new Error("API Failure");
      mockRunClient.projects.locations.operations.get.mockRejectedValue(error);
      const loggerSpy = vi.spyOn(mockLogger, "error");

      await expect(provider.getOperation("op-123")).rejects.toThrow(
        "API Failure",
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        { err: error, name: "op-123" },
        "Failed to get operation",
      );
    });
  });

  describe("startDeployTenantInstance", () => {
    it("should throw error if no operation name is returned", async () => {
      // Mock checkResourceExists to return false (force create path)
      // When checking existence, we call get()
      (mockRunClient.projects.locations.services.get as Mock).mockRejectedValue(
        {
          code: 404,
        },
      );

      // Mock create to return data WITHOUT name

      (
        mockRunClient.projects.locations.services.create as unknown as Mock
      ).mockResolvedValue({ data: {} });

      await expect(
        provider.startDeployTenantInstance("tenant-123", {
          databaseUrl: "db-url",
          redisUrl: "redis-url",
          redisPrefix: "prefix:",
          subdomain: "sub",
          jwtSecret: "secret",
          cookieSecret: "secret",
        }),
      ).rejects.toThrow(
        "Failed to start deployment: No operation name returned from Cloud Run API",
      );
    });
  });

  describe("triggerMigrationJob", () => {
    it("should throw error if execution start fails (no name)", async () => {
      // Mock runJobExecution which calls jobs.run
      // Return data WITHOUT name
      (mockRunClient.projects.locations.jobs.run as Mock).mockResolvedValue({
        data: {},
      });

      await expect(provider.triggerMigrationJob("tenant-123")).rejects.toThrow(
        "Failed to start migration job execution",
      );
    });
  });
});
