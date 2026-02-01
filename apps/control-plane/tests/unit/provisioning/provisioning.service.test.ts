import { createLogger } from "@vendin/utils/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProvisioningService } from "../../../src/domains/provisioning/provisioning.service";
import { CloudRunProvider } from "../../../src/providers/gcp/cloud-run.client";
import { NeonProvider } from "../../../src/providers/neon/neon.client";

import type { TenantRepository } from "../../../src/domains/tenants/tenant.repository";
import type { Tenant } from "../../../src/domains/tenants/tenant.types";

vi.mock("../../../src/providers/neon/neon.client");
vi.mock("../../../src/providers/gcp/cloud-run.client");
vi.mock("@google-cloud/workflows", () => {
  return {
    ExecutionsClient: vi.fn().mockImplementation(() => ({
      createExecution: vi.fn().mockResolvedValue({ name: "mock-execution" }),
    })),
  };
});

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
    } as unknown as TenantRepository;

    mockNeonProvider = {
      createTenantDatabase: vi.fn().mockResolvedValue("postgres://db-url"),
      deleteTenantDatabase: vi.fn().mockResolvedValue(void 0),
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
    };
    vi.mocked(CloudRunProvider).mockImplementation(
      () => mockCloudRunProvider as unknown as CloudRunProvider,
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
});
