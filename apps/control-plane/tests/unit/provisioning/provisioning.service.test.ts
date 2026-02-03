import { createLogger } from "@vendin/utils/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProvisioningService,
  type ProvisioningServiceConfig,
} from "../../../src/domains/provisioning/provisioning.service";
import { CloudRunProvider } from "../../../src/providers/gcp/cloud-run.client";
import { GcpWorkflowsClient } from "../../../src/providers/gcp/workflows.client";
import { NeonProvider } from "../../../src/providers/neon/neon.client";

import type { TenantRepository } from "../../../src/domains/tenants/tenant.repository";
import type { Tenant } from "../../../src/domains/tenants/tenant.types";

vi.mock("../../../src/providers/neon/neon.client");
vi.mock("../../../src/providers/gcp/cloud-run.client");
vi.mock("../../../src/providers/gcp/workflows.client");

describe("ProvisioningService Granular Steps", () => {
  let service: ProvisioningService;
  let repository: TenantRepository;
  let mockNeonProvider: {
    createTenantDatabase: ReturnType<typeof vi.fn>;
    deleteTenantDatabase: ReturnType<typeof vi.fn>;
  };
  let mockCloudRunProvider: {
    startDeployTenantInstance: ReturnType<typeof vi.fn>;
    finalizeTenantService: ReturnType<typeof vi.fn>;
    triggerMigrationJob: ReturnType<typeof vi.fn>;
    deleteTenantInstance: ReturnType<typeof vi.fn>;
    getOperation: ReturnType<typeof vi.fn>;
    ensureMigrationJob: ReturnType<typeof vi.fn>;
    deleteMigrationJob: ReturnType<typeof vi.fn>;
    getJobExecutionStatus: ReturnType<typeof vi.fn>;
  };
  let mockWorkflowsClient: {
    triggerProvisionTenant: ReturnType<typeof vi.fn>;
  };
  const logger = createLogger({ logLevel: "silent" });

  beforeEach(() => {
    vi.clearAllMocks();

    repository = {
      create: vi.fn().mockResolvedValue({
        id: "tenant-1",
        status: "provisioning",
        redisHash: "mock-hash",
      }),
      update: vi.fn().mockResolvedValue({}),
      findBySubdomain: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue({
        id: "tenant-1",
        databaseUrl: "postgres://db-url",
        redisHash: "mock-hash",
        subdomain: "test",
      }),
      softDelete: vi.fn(),
      findAll: vi.fn(),
      logProvisioningEvent: vi.fn().mockResolvedValue(async () => {}),
    } as unknown as TenantRepository;

    mockNeonProvider = {
      createTenantDatabase: vi.fn().mockResolvedValue("postgres://db-url"),
      deleteTenantDatabase: vi.fn().mockResolvedValue(async () => {}),
    };
    vi.mocked(NeonProvider).mockImplementation(
      () => mockNeonProvider as unknown as NeonProvider,
    );

    mockCloudRunProvider = {
      startDeployTenantInstance: vi.fn().mockResolvedValue("mock-operation"),
      finalizeTenantService: vi.fn().mockResolvedValue("https://service-url"),
      triggerMigrationJob: vi.fn().mockResolvedValue("mock-operation"),
      deleteTenantInstance: vi.fn().mockResolvedValue("mock-operation"),
      getOperation: vi.fn().mockResolvedValue({ done: true }),
      ensureMigrationJob: vi.fn().mockResolvedValue("mock-operation"),
      getJobExecutionStatus: vi.fn().mockResolvedValue({ status: "success" }),
      deleteMigrationJob: vi.fn().mockResolvedValue("mock-operation"),
    };
    vi.mocked(CloudRunProvider).mockImplementation(
      () => mockCloudRunProvider as unknown as CloudRunProvider,
    );

    mockWorkflowsClient = {
      triggerProvisionTenant: vi.fn().mockResolvedValue(async () => {}),
    };
    vi.mocked(GcpWorkflowsClient).mockImplementation(
      () => mockWorkflowsClient as unknown as GcpWorkflowsClient,
    );

    service = new ProvisioningService(repository, {
      logger,
      neonApiKey: "key",
      neonProjectId: "proj",
      gcpCredentialsJson: "{}",
      gcpProjectId: "gcp-proj",
      gcpRegion: "us-central1",
      tenantImageTag: "tag",
      upstashRedisUrl: "redis://",
    });
  });

  describe("Provider Initialization", () => {
    it("should throw error if provider initialization fails", () => {
      vi.mocked(NeonProvider).mockImplementationOnce(() => {
        throw new Error("Neon Init Error");
      });

      expect(
        () =>
          new ProvisioningService(repository, {
            logger,
            neonApiKey: "key",
            neonProjectId: "proj",
          } as unknown as ProvisioningServiceConfig),
      ).toThrow("Neon Init Error");
    });
  });

  describe("provisionDatabase", () => {
    it("should provision database and update tenant", async () => {
      const result = await service.provisionDatabase("tenant-1");

      expect(result.databaseUrl).toBe("postgres://db-url");
      expect(mockNeonProvider.createTenantDatabase).toHaveBeenCalledWith(
        "tenant-1",
      );
      expect(repository.update).toHaveBeenCalledWith("tenant-1", {
        databaseUrl: "postgres://db-url",
      });
    });
  });

  describe("triggerMigrationJob", () => {
    it("should trigger migration job", async () => {
      await service.triggerMigrationJob("tenant-1");
      expect(mockCloudRunProvider.triggerMigrationJob).toHaveBeenCalledWith(
        "tenant-1",
      );
    });

    it("should fail if prerequisites are missing", async () => {
      vi.mocked(repository.findById).mockResolvedValueOnce({
        id: "tenant-1",
        databaseUrl: null, // Missing DB URL
      } as unknown as Tenant);

      await expect(service.triggerMigrationJob("tenant-1")).rejects.toThrow(
        "Database URL missing",
      );
    });
  });

  describe("finalizeDeployment", () => {
    it("should finalize deployment and update tenant", async () => {
      await service.finalizeDeployment("tenant-1");

      expect(mockCloudRunProvider.finalizeTenantService).toHaveBeenCalledWith(
        "tenant-1",
      );

      expect(repository.update).toHaveBeenCalledWith("tenant-1", {
        apiUrl: "https://service-url",
      });
    });

    it("should fail if subdomain is missing", async () => {
      vi.mocked(repository.findById).mockResolvedValueOnce({
        id: "tenant-1",
        databaseUrl: "postgres://db",
        redisHash: "hash",
        subdomain: null, // Missing subdomain
      } as unknown as Tenant);

      await expect(service.finalizeDeployment("tenant-1")).rejects.toThrow(
        "Subdomain missing",
      );
    });
  });

  describe("rollbackResources", () => {
    it("should delete database and service and mark tenant as failed", async () => {
      await service.rollbackResources("tenant-1");

      expect(mockNeonProvider.deleteTenantDatabase).toHaveBeenCalledWith(
        "tenant-1",
      );
      expect(mockCloudRunProvider.deleteTenantInstance).toHaveBeenCalledWith(
        "tenant-1",
      );

      expect(repository.update).toHaveBeenCalledWith("tenant-1", {
        status: "provisioning_failed",
        failureReason: "Provisioning workflow failed and rolled back",
      });
    });
  });

  describe("activateTenant", () => {
    it("should activate tenant", async () => {
      await service.activateTenant("tenant-1");
      expect(repository.update).toHaveBeenCalledWith("tenant-1", {
        status: "active",
      });
    });
  });

  describe("triggerProvisioningWorkflow", () => {
    it("should trigger provisioning workflow", async () => {
      await service.triggerProvisioningWorkflow(
        "tenant-1",
        "https://control-plane.url",
      );

      expect(repository.logProvisioningEvent).toHaveBeenCalledWith(
        "tenant-1",
        "trigger_workflow",
        "started",
      );
      expect(mockWorkflowsClient.triggerProvisionTenant).toHaveBeenCalled();
      expect(repository.logProvisioningEvent).toHaveBeenCalledWith(
        "tenant-1",
        "trigger_workflow",
        "completed",
      );
    });

    it("should handle workflow trigger failure", async () => {
      const error = new Error("Trigger failed");
      mockWorkflowsClient.triggerProvisionTenant.mockRejectedValue(error);

      await expect(
        service.triggerProvisioningWorkflow(
          "tenant-1",
          "https://control-plane.url",
        ),
      ).rejects.toThrow("Trigger failed");

      expect(repository.update).toHaveBeenCalledWith("tenant-1", {
        status: "provisioning_failed",
        failureReason: "Trigger failed",
      });

      expect(repository.logProvisioningEvent).toHaveBeenCalledWith(
        "tenant-1",
        "trigger_workflow",
        "failed",
        { error: "Trigger failed" },
      );
    });
  });

  describe("configureDomain", () => {
    it("should configure domain (placeholder)", async () => {
      await expect(service.configureDomain("tenant-1")).resolves.not.toThrow();
    });

    it("should throw if subdomain missing", async () => {
      vi.mocked(repository.findById).mockResolvedValueOnce({
        id: "tenant-1",
        subdomain: null,
      } as unknown as Tenant);

      await expect(service.configureDomain("tenant-1")).rejects.toThrow(
        "Subdomain missing",
      );
    });
  });

  describe("startDeployService", () => {
    it("should start deploy service operation", async () => {
      const result = await service.startDeployService("tenant-1");
      expect(result.operationName).toBe("mock-operation");
      expect(
        mockCloudRunProvider.startDeployTenantInstance,
      ).toHaveBeenCalledWith("tenant-1", expect.anything());
    });
  });

  describe("ensureMigrationJob", () => {
    it("should ensure migration job exists", async () => {
      const result = await service.ensureMigrationJob("tenant-1");
      expect(result.operationName).toBe("mock-operation");
      expect(mockCloudRunProvider.ensureMigrationJob).toHaveBeenCalledWith(
        "tenant-1",
        expect.anything(),
      );
    });
  });

  describe("getOperationStatus", () => {
    it("should get operation status", async () => {
      const result = await service.getOperationStatus("op-123");
      expect(result.done).toBe(true);
      expect(mockCloudRunProvider.getOperation).toHaveBeenCalledWith("op-123");
    });
  });

  describe("getMigrationStatus", () => {
    it("should get migration status", async () => {
      const result = await service.getMigrationStatus("exec-123");
      expect(result.status).toBe("success");
      expect(mockCloudRunProvider.getJobExecutionStatus).toHaveBeenCalledWith(
        "exec-123",
      );
    });
  });
  describe("deleteMigrationJob", () => {
    it("should delete migration job", async () => {
      await service.deleteMigrationJob("tenant-1");
      expect(mockCloudRunProvider.deleteMigrationJob).toHaveBeenCalledWith(
        "tenant-1",
      );
    });

    it("should throw error if provider initialization fails", async () => {
      vi.mocked(NeonProvider).mockImplementationOnce(() => {
        throw new Error("Neon Init Error");
      });

      // Force cloudRunProvider to be undefined to test the guard clause
      (service as unknown as { cloudRunProvider: unknown }).cloudRunProvider =
        undefined;
      await expect(service.deleteMigrationJob("tenant-1")).rejects.toThrow(
        "Cloud Run provider not initialized",
      );
    });
  });
});
