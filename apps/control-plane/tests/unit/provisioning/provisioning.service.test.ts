import { createLogger } from "@vendin/logger";
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
    createTenantProject: ReturnType<typeof vi.fn>;
    deleteTenantProject: ReturnType<typeof vi.fn>;
    createSnapshot: ReturnType<typeof vi.fn>;
    restoreFromSnapshot: ReturnType<typeof vi.fn>;
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
        neonProjectId: "proj-1",
      }),
      softDelete: vi.fn(),
      findAll: vi.fn(),
      logProvisioningEvent: vi.fn().mockResolvedValue(async () => {}),
    } as unknown as TenantRepository;

    mockNeonProvider = {
      createTenantProject: vi.fn().mockResolvedValue({ projectId: "proj-1", connectionString: "postgres://db-url" }),
      deleteTenantProject: vi.fn().mockResolvedValue(async () => {}),
      createSnapshot: vi.fn().mockResolvedValue("snap-id"),
      restoreFromSnapshot: vi.fn().mockResolvedValue(undefined),
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
      neonOrgId: "proj",
      gcpCredentialsJson: "{}",
      gcpProjectId: "gcp-proj",
      gcpRegion: "us-central1",
      tenantImageTag: "tag",
      upstashRedisUrl: "redis://",
      tenantBaseDomain: "vendin.store",
      storefrontHostname: "storefront.vendin.store",
      cloudflareApiToken: "cf-token",
      cloudflareZoneId: "cf-zone",
    });
  });

  describe("provisionDatabase", () => {
    it("should provision database and update tenant", async () => {
      const result = await service.provisionDatabase("tenant-1");

      expect(result.databaseUrl).toBe("postgres://db-url");
      expect(mockNeonProvider.createTenantProject).toHaveBeenCalledWith(
        "tenant-1",
      );
      expect(repository.update).toHaveBeenCalledWith("tenant-1", {
        databaseUrl: "postgres://db-url",
        neonProjectId: "proj-1"
      });
    });
  });

  describe("createDatabaseSnapshot", () => {
      it("should create snapshot", async () => {
          await service.createDatabaseSnapshot("tenant-1", "snap-1");
          expect(mockNeonProvider.createSnapshot).toHaveBeenCalledWith("proj-1", "snap-1");
      });
  });

  describe("rollbackResources", () => {
    it("should delete database and service and mark tenant as failed", async () => {
      await service.rollbackResources("tenant-1");

      expect(mockNeonProvider.deleteTenantProject).toHaveBeenCalledWith(
        "proj-1",
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

  // ... (Other tests remain mostly same, just updating startDeployTenantInstance expectation)

  describe("startDeployService", () => {
    it("should start deploy service operation", async () => {
      const result = await service.startDeployService("tenant-1");
      expect(result.operationName).toBe("mock-operation");
      expect(
        mockCloudRunProvider.startDeployTenantInstance,
      ).toHaveBeenCalledWith("tenant-1", expect.anything(), undefined);
    });
  });

  // ... (triggerMigrationJob etc)
});
