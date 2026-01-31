import { createLogger } from "@vendin/utils/logger";
/* eslint-disable vitest/expect-expect */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { CloudRunProvider } from "../../../src/providers/gcp/cloud-run.client";

// Mock googleapis
const mockJobsGet = vi.fn();
const mockJobsPatch = vi.fn();
const mockJobsCreate = vi.fn();
const mockJobsRun = vi.fn();
const mockExecutionsGet = vi.fn();
const mockOperationsGet = vi.fn();
const mockServicesGet = vi.fn();
const mockServicesPatch = vi.fn();
const mockServicesCreate = vi.fn();
const mockServicesGetIamPolicy = vi.fn();
const mockServicesSetIamPolicy = vi.fn();

vi.mock("googleapis", () => {
  return {
    run_v2: {
      Run: vi.fn().mockImplementation(() => ({
        projects: {
          locations: {
            jobs: {
              get: mockJobsGet,
              patch: mockJobsPatch,
              create: mockJobsCreate,
              run: mockJobsRun,
              executions: {
                get: mockExecutionsGet,
              },
            },
            services: {
              get: mockServicesGet,
              patch: mockServicesPatch,
              create: mockServicesCreate,
              getIamPolicy: mockServicesGetIamPolicy,
              setIamPolicy: mockServicesSetIamPolicy,
            },
            operations: {
              get: mockOperationsGet,
            },
          },
        },
      })),
    },
  };
});

// Mock google-auth-library
vi.mock("google-auth-library", () => ({
  GoogleAuth: vi.fn().mockImplementation(() => ({})),
}));

const setupMigrationOperations = (overrides: Record<string, unknown> = {}) => {
  mockOperationsGet.mockImplementation(({ name }: { name: string }) => {
    if (name === "job-op-1") return { data: { done: true } };
    if (name === "exec-op-1") {
      return {
        data: { done: true, response: { name: "exec-1" }, ...overrides },
      };
    }
    return { data: { done: false } };
  });
};

const expectToRejectWithTimers = async (
  promise: Promise<unknown>,
  message: string,
) => {
  await Promise.all([
    vi.runAllTimersAsync(),
    expect(promise).rejects.toThrow(message),
  ]);
};

describe("CloudRunProvider", () => {
  let provider: CloudRunProvider;
  const logger = createLogger({ logLevel: "silent", nodeEnv: "test" });
  const config = {
    projectId: "test-project",
    region: "us-central1",
    tenantImageTag: "latest",
    logger,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    provider = new CloudRunProvider(config);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("runTenantMigrations", () => {
    const tenantId = "tenant-1";
    const environment = { DATABASE_URL: "postgres://" };

    it("should complete migrations successfully", async () => {
      // 1. getOrCreateJob (exists = false)
      mockJobsGet.mockRejectedValue({ code: 404 });
      mockJobsCreate.mockResolvedValue({ data: { name: "job-op-1" } });

      // 2. runJobExecution
      mockJobsRun.mockResolvedValue({ data: { name: "exec-op-1" } });

      setupMigrationOperations();

      // Poll execution status (NOT called anymore in runTenantMigrations, but needed for polling)
      // The new logic only waits for trigger.

      const executionName = await provider.runTenantMigrations(tenantId, environment);

      await vi.runAllTimersAsync();

      expect(executionName).toBe("exec-1");
      expect(mockJobsCreate).toHaveBeenCalled();
      expect(mockJobsRun).toHaveBeenCalled();
      // mockExecutionsGet should NOT be called in trigger phase anymore
      expect(mockExecutionsGet).not.toHaveBeenCalled();
    });

    it("should throw if operation fails with error", async () => {
      mockJobsGet.mockResolvedValue({ data: {} });
      mockJobsPatch.mockResolvedValue({ data: { name: "job-op-1" } });
      mockJobsRun.mockResolvedValue({ data: { name: "exec-op-1" } });

      setupMigrationOperations({ error: { message: "Internal error" } });

      const promise = provider.runTenantMigrations(tenantId, environment);

      await expectToRejectWithTimers(
        promise,
        "Migration trigger failed: Internal error",
      );
    });

    it("should throw if execution name is missing in operation response", async () => {
      mockJobsGet.mockResolvedValue({ data: {} });
      mockJobsPatch.mockResolvedValue({ data: { name: "job-op-1" } });
      mockJobsRun.mockResolvedValue({ data: { name: "exec-op-1" } });

      setupMigrationOperations({ response: {} });

      const promise = provider.runTenantMigrations(tenantId, environment);

      await expectToRejectWithTimers(
        promise,
        "Job trigger completed but execution name is missing",
      );
    });

    it("should timeout if execution operation never completes", async () => {
      mockJobsGet.mockResolvedValue({ data: {} });
      mockJobsPatch.mockResolvedValue({ data: { name: "job-op-1" } });
      mockJobsRun.mockResolvedValue({ data: { name: "exec-op-1" } });

      mockOperationsGet.mockImplementation(({ name }) => {
        if (name === "job-op-1") return { data: { done: true } };
        // exec-op-1 never completes
        return { data: { done: false } };
      });

      const promise = provider.runTenantMigrations(tenantId, environment);

      await expectToRejectWithTimers(
        promise,
        "Timeout waiting for migration job to trigger",
      );
    });
  });

  describe("getJobExecutionStatus", () => {
      it("should return success when succeededCount > 0", async () => {
          mockExecutionsGet.mockResolvedValue({ data: { succeededCount: 1 } });
          const status = await provider.getJobExecutionStatus("exec-1");
          expect(status).toEqual({ status: "success" });
      });

      it("should return failed when failedCount > 0", async () => {
          mockExecutionsGet.mockResolvedValue({
              data: {
                  failedCount: 1,
                  conditions: [{ state: "CONDITION_FAILED", message: "Boom" }]
              }
          });
          const status = await provider.getJobExecutionStatus("exec-1");
          expect(status).toEqual({ status: "failed", error: "Boom" });
      });

      it("should return running when neither", async () => {
          mockExecutionsGet.mockResolvedValue({ data: { succeededCount: 0 } });
          const status = await provider.getJobExecutionStatus("exec-1");
          expect(status).toEqual({ status: "running" });
      });
  });

  describe("deployTenantInstance", () => {
    it("should deploy successfully", async () => {
      mockServicesGet.mockRejectedValueOnce({ code: 404 });
      mockServicesCreate.mockResolvedValue({ data: { name: "svc-op-1" } });
      mockOperationsGet.mockResolvedValue({ data: { done: true } });
      mockServicesGetIamPolicy.mockResolvedValue({ data: { bindings: [] } });
      mockServicesSetIamPolicy.mockResolvedValue({ data: {} });
      mockServicesGet.mockResolvedValue({ data: { uri: "https://svc-url" } });

      const url = await provider.deployTenantInstance("tenant-1", {});

      expect(url).toBe("https://svc-url");
      expect(mockServicesCreate).toHaveBeenCalled();
      expect(mockServicesSetIamPolicy).toHaveBeenCalled();
    });
  });
});
