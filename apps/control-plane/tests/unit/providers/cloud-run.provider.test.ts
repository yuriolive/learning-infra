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

describe("CloudRunProvider", () => {
  let provider: CloudRunProvider;
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
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

  describe("ensureMigrationJob", () => {
    const tenantId = "tenant-1";
    const appConfig = {
      databaseUrl: "postgres://",
      redisUrl: "redis://",
      redisPrefix: "t_1:",
      jwtSecret: "secret",
      cookieSecret: "secret",
    };

    it("should create/patch job successfully", async () => {
      mockJobsGet.mockRejectedValue({ code: 404 });
      mockJobsCreate.mockResolvedValue({ data: { name: "job-op-1" } });

      const opName = await provider.ensureMigrationJob(tenantId, appConfig);

      expect(opName).toBe("job-op-1");
      expect(mockJobsCreate).toHaveBeenCalled();
    });
  });

  describe("triggerMigrationJob", () => {
    it("should trigger job execution and return execution operation", async () => {
      mockJobsRun.mockResolvedValue({ data: { name: "exec-op-1" } });

      const opName = await provider.triggerMigrationJob("tenant-1");

      expect(opName).toBe("exec-op-1");
      expect(mockJobsRun).toHaveBeenCalled();
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
          conditions: [{ state: "CONDITION_FAILED", message: "Boom" }],
        },
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

  describe("startDeployTenantInstance", () => {
    it("should start deployment and return operation name", async () => {
      mockServicesGet.mockRejectedValueOnce({ code: 404 });
      mockServicesCreate.mockResolvedValue({ data: { name: "svc-op-1" } });

      const opName = await provider.startDeployTenantInstance("tenant-1", {
        databaseUrl: "postgres://",
        redisUrl: "redis://",
        redisPrefix: "t_1:",
        subdomain: "tenant-1",
        jwtSecret: "secret",
        cookieSecret: "secret",
      });

      expect(opName).toBe("svc-op-1");
      expect(mockServicesCreate).toHaveBeenCalled();
    });
  });

  describe("finalizeTenantService", () => {
    it("should finalize and return URI", async () => {
      mockServicesGet.mockResolvedValue({ data: { uri: "https://svc-url" } });

      const url = await provider.finalizeTenantService("tenant-1");

      expect(url).toBe("https://svc-url");
    });
  });
});
