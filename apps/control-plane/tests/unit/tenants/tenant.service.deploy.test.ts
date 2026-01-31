import { createLogger } from "@vendin/utils/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TenantService } from "../../../src/domains/tenants/tenant.service";
import { CloudRunProvider } from "../../../src/providers/gcp/cloud-run.client";
import { NeonProvider } from "../../../src/providers/neon/neon.client";

import type { TenantRepository } from "../../../src/domains/tenants/tenant.repository";

vi.mock("../../../src/providers/neon/neon.client");
vi.mock("../../../src/providers/gcp/cloud-run.client");
vi.mock("@google-cloud/workflows", () => {
  return {
    ExecutionsClient: vi.fn().mockImplementation(() => ({
      createExecution: vi.fn().mockResolvedValue({ name: "mock-execution" }),
    })),
  };
});

describe("TenantService Granular Provisioning", () => {
  let service: TenantService;
  let repository: TenantRepository;
  let mockNeonProvider: {
    createTenantDatabase: ReturnType<typeof vi.fn>;
    deleteTenantDatabase: ReturnType<typeof vi.fn>;
  };
  let mockCloudRunProvider: {
    deployTenantInstance: ReturnType<typeof vi.fn>;
    runTenantMigrations: ReturnType<typeof vi.fn>;
    deleteTenantInstance: ReturnType<typeof vi.fn>;
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
      deleteTenantDatabase: vi.fn().mockImplementation(async () => {}),
    };
    (NeonProvider as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockNeonProvider,
    );

    mockCloudRunProvider = {
      deployTenantInstance: vi.fn().mockResolvedValue("https://service-url"),
      runTenantMigrations: vi.fn().mockResolvedValue(void 0),
      deleteTenantInstance: vi.fn().mockImplementation(async () => {}),
    };
    (
      CloudRunProvider as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => mockCloudRunProvider);

    service = new TenantService(repository, {
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
      await service.provisionDatabase("tenant-1");

      expect(mockNeonProvider.createTenantDatabase).toHaveBeenCalledWith("tenant-1");
      expect(repository.update).toHaveBeenCalledWith("tenant-1", {
        databaseUrl: "postgres://db-url",
      });
    });
  });

  describe("runMigrations", () => {
    it("should run migrations", async () => {
      await service.runMigrations("tenant-1");
      expect(mockCloudRunProvider.runTenantMigrations).toHaveBeenCalledWith(
        "tenant-1",
        expect.objectContaining({
            DATABASE_URL: "postgres://db-url",
            REDIS_URL: "redis://",
        })
      );
    });
  });

  describe("deployService", () => {
    it("should deploy service and update tenant", async () => {
      await service.deployService("tenant-1");

      expect(mockCloudRunProvider.deployTenantInstance).toHaveBeenCalledWith(
        "tenant-1",
        expect.objectContaining({
          DATABASE_URL: "postgres://db-url",
          REDIS_URL: "redis://",
          STORE_CORS: expect.stringContaining("test.vendin.store"),
        }),
      );

      expect(repository.update).toHaveBeenCalledWith("tenant-1", {
        apiUrl: "https://service-url",
      });
    });
  });

  describe("rollbackResources", () => {
    it("should delete database and service and mark tenant as failed", async () => {
      await service.rollbackResources("tenant-1");

      expect(mockNeonProvider.deleteTenantDatabase).toHaveBeenCalledWith("tenant-1");
      expect(mockCloudRunProvider.deleteTenantInstance).toHaveBeenCalledWith("tenant-1");

      expect(repository.update).toHaveBeenCalledWith("tenant-1", {
          status: "provisioning_failed",
          failureReason: "Provisioning workflow failed and rolled back",
      });
    });
  });
});
