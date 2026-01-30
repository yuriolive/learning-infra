import { createLogger } from "@vendin/utils/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TenantService } from "../../../src/domains/tenants/tenant.service";
import { CloudRunProvider } from "../../../src/providers/gcp/cloud-run.client";
import { NeonProvider } from "../../../src/providers/neon/neon.client";

import type { TenantRepository } from "../../../src/domains/tenants/tenant.repository";

vi.mock("../../../src/providers/neon/neon.client");
vi.mock("../../../src/providers/gcp/cloud-run.client");

describe("TenantService Deployment", () => {
  let service: TenantService;
  let repository: TenantRepository;
  let mockNeonProvider: {
    createTenantDatabase: unknown;
    deleteTenantDatabase: unknown;
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
      findById: vi.fn(),
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

  it("should enforce subdomain requirement", async () => {
    const input = { name: "Test", merchantEmail: "test@test.com" };
    await expect(service.createTenant(input)).rejects.toThrow(
      "Subdomain is required",
    );
  });

  it("should trigger background provisioning", async () => {
    const waitUntil = vi.fn();
    const input = {
      name: "Test",
      merchantEmail: "test@test.com",
      subdomain: "test",
    };

    const result = await service.createTenant(input, waitUntil);

    expect(result.status).toBe("provisioning");
    expect(waitUntil).toHaveBeenCalled();

    // Execute the background task
    const task = waitUntil.mock.calls[0]![0];
    await task;

    expect(mockNeonProvider.createTenantDatabase).toHaveBeenCalledWith(
      "tenant-1",
    );
    expect(mockCloudRunProvider.deployTenantInstance).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        DATABASE_URL: "postgres://db-url",
        REDIS_URL: "redis://",
        STORE_CORS: expect.stringContaining("test.vendin.store"),
      }),
    );

    // Verify incremental updates
    expect(repository.update).toHaveBeenCalledWith("tenant-1", {
      databaseUrl: "postgres://db-url",
    });

    expect(repository.update).toHaveBeenCalledWith("tenant-1", {
      apiUrl: "https://service-url",
      status: "active",
    });
  });

  it("should handle provisioning failure", async () => {
    mockCloudRunProvider.deployTenantInstance.mockRejectedValue(
      new Error("Deploy failed"),
    );

    const waitUntil = vi.fn();
    const input = {
      name: "Test",
      merchantEmail: "test@test.com",
      subdomain: "test",
    };

    await service.createTenant(input, waitUntil);
    const task = waitUntil.mock.calls[0]![0];
    await task;

    expect(repository.update).toHaveBeenCalledWith("tenant-1", {
      status: "provisioning_failed",
      failureReason: "Deploy failed",
    });
  });

  describe("provisionResources failure paths", () => {
    it.each([
      {
        name: "missing Upstash Redis URL",
        config: {
          logger,
          neonApiKey: "key",
          neonProjectId: "proj",
          gcpCredentialsJson: "{}",
          gcpProjectId: "gcp-proj",
          gcpRegion: "us-central1",
          tenantImageTag: "tag",
        },
        redisHash: "mock-hash",
        expectedReason: "Missing Upstash Redis URL",
      },
      {
        name: "missing Redis Hash",
        config: {
          logger,
          neonApiKey: "key",
          neonProjectId: "proj",
          gcpCredentialsJson: "{}",
          gcpProjectId: "gcp-proj",
          gcpRegion: "us-central1",
          tenantImageTag: "tag",
          upstashRedisUrl: "redis://",
        },
        redisHash: null,
        expectedReason: "Redis hash missing",
      },
    ])(
      "should fail provisioning if $name",
      async ({ config, redisHash, expectedReason }) => {
        const serviceWithError = new TenantService(repository, config);
        const serviceAny = serviceWithError as unknown as {
          provisionResources: (
            tenantId: string,
            subdomain: string,
            redisHash: string | null,
          ) => Promise<void>;
        };

        await serviceAny.provisionResources("tenant-1", "test", redisHash);

        expect(mockNeonProvider.createTenantDatabase).not.toHaveBeenCalled();
        expect(repository.update).toHaveBeenCalledWith("tenant-1", {
          status: "provisioning_failed",
          failureReason: expectedReason,
        });
      },
    );
  });
});
