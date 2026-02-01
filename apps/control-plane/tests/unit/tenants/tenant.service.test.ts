import { randomUUID } from "node:crypto";

import { createLogger } from "@vendin/utils/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock NeonProvider
vi.mock("../../../src/providers/neon/neon.client", () => {
  return {
    NeonProvider: vi.fn().mockImplementation(() => ({
      createTenantDatabase: vi.fn().mockResolvedValue("postgres://mock-db-url"),
      deleteTenantDatabase: vi.fn().mockResolvedValue(void 0),
    })),
  };
});

// Mock CloudRunProvider
vi.mock("../../../src/providers/gcp/cloud-run.client", () => {
  return {
    CloudRunProvider: vi.fn().mockImplementation(() => ({
      deployTenantInstance: vi
        .fn()
        .mockResolvedValue("https://mock-service-url"),
      runTenantMigrations: vi.fn().mockResolvedValue(void 0),
      deleteTenantInstance: vi.fn().mockResolvedValue(void 0),
    })),
  };
});

// Mock GcpWorkflowsClient
vi.mock("../../../src/providers/gcp/workflows.client", () => {
  return {
    GcpWorkflowsClient: vi.fn().mockImplementation(() => ({
      createExecution: vi.fn().mockResolvedValue(void 0),
      triggerProvisionTenant: vi.fn().mockResolvedValue(void 0),
    })),
  };
});

import { ProvisioningService } from "../../../src/domains/provisioning/provisioning.service";
import {
  SubdomainInUseError,
  SubdomainRequiredError,
  TenantNotFoundError,
} from "../../../src/domains/tenants/tenant.errors";
import { TenantRepository } from "../../../src/domains/tenants/tenant.repository";
import { TenantService } from "../../../src/domains/tenants/tenant.service";
import { createMockDatabase } from "../../utils/mock-database";

import type {
  CreateTenantInput,
  UpdateTenantInput,
} from "../../../src/domains/tenants/tenant.types";

describe("TenantService", () => {
  let service: TenantService;
  let repository: TenantRepository;
  let provisioningService: ProvisioningService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const logger = createLogger({ logLevel: "silent", nodeEnv: "test" });
    const database = await createMockDatabase();
    repository = new TenantRepository(database);

    const config = {
      logger,
      neonApiKey: "mock-key",
      neonProjectId: "mock-project",
      gcpCredentialsJson: "{}",
      gcpProjectId: "mock-gcp-project",
      gcpRegion: "mock-region",
      tenantImageTag: "mock-tag",
      upstashRedisUrl: "redis://mock",
    };

    provisioningService = new ProvisioningService(repository, config);
    vi.spyOn(provisioningService, "triggerProvisioningWorkflow");

    service = new TenantService(repository, provisioningService, config);
  });

  const createTenantHelper = (index: number) => {
    return service.createTenant(
      {
        name: `Store ${index}`,
        merchantEmail: `store${index}@example.com`,
        subdomain: `store${index}`,
      },
      "https://mock.base.url",
    );
  };

  describe("createTenant", () => {
    it("should create a tenant successfully", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      };

      const tenant = await service.createTenant(input, "https://mock.base.url");

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe("Test Store");
      expect(tenant.subdomain).toBe("teststore");
      expect(tenant.status).toBe("provisioning");

      expect(
        provisioningService.triggerProvisioningWorkflow,
      ).toHaveBeenCalled();
    });

    it("should trigger workflow if GCP project configured", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      };

      await service.createTenant(input, "https://mock.base.url");
      expect(
        provisioningService.triggerProvisioningWorkflow,
      ).toHaveBeenCalled();
    });

    it("should throw error when domain already exists", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      };

      await service.createTenant(input, "https://mock.base.url");

      await expect(
        service.createTenant(input, "https://mock.base.url"),
      ).rejects.toThrow(SubdomainInUseError);
    });

    it("should throw error if subdomain is missing", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        // subdomain missing
      };

      await expect(
        service.createTenant(input, "https://mock.base.url"),
      ).rejects.toThrow(SubdomainRequiredError);
    });

    it("should fail if workflow triggering fails", async () => {
      // Mock failure in execution creation
      vi.mocked(
        provisioningService.triggerProvisioningWorkflow,
      ).mockRejectedValueOnce(new Error("Workflow trigger failed"));

      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      };

      await expect(
        service.createTenant(input, "https://mock.base.url"),
      ).rejects.toThrow("Workflow trigger failed");
    });

    it("should update tenant status to provisioning_failed if workflow triggering fails", async () => {
      // Mock failure in execution creation
      const errorMessage = "Workflow trigger failed";
      vi.mocked(
        provisioningService.triggerProvisioningWorkflow,
      ).mockRejectedValueOnce(new Error(errorMessage));

      const input: CreateTenantInput = {
        name: "Failed Store",
        merchantEmail: "failed@example.com",
        subdomain: "failedstore",
      };

      // Expect the service to throw
      await expect(
        service.createTenant(input, "https://mock.base.url"),
      ).rejects.toThrow(errorMessage);

      // Verify DB state
      const tenant = await repository.findBySubdomain(input.subdomain!);
      expect(tenant).toBeDefined();
      expect(tenant?.status).toBe("provisioning_failed");
      expect(tenant?.failureReason).toBe(errorMessage);
    });
  });

  describe("getTenant", () => {
    it("should return tenant when found", async () => {
      const created = await service.createTenant(
        {
          name: "Test Store",
          merchantEmail: "test@example.com",
          subdomain: "teststore",
        },
        "https://mock.base.url",
      );

      const tenant = await service.getTenant(created.id);

      expect(tenant.id).toBe(created.id);
      expect(tenant.name).toBe("Test Store");
    });

    it("should throw error when tenant not found", async () => {
      await expect(service.getTenant(randomUUID())).rejects.toThrow(
        TenantNotFoundError,
      );
    });
  });

  describe("updateTenant", () => {
    it("should update tenant successfully", async () => {
      const created = await service.createTenant(
        {
          name: "Original Name",
          merchantEmail: "test@example.com",
          subdomain: "original",
        },
        "https://mock.base.url",
      );

      const input: UpdateTenantInput = {
        name: "Updated Name",
        status: "suspended",
      };

      const updated = await service.updateTenant(created.id, input);

      expect(updated.name).toBe("Updated Name");
      expect(updated.status).toBe("suspended");
      expect(updated.id).toBe(created.id);
    });

    it("should throw error when tenant not found", async () => {
      const input: UpdateTenantInput = {
        name: "Updated Name",
      };

      await expect(service.updateTenant(randomUUID(), input)).rejects.toThrow(
        TenantNotFoundError,
      );
    });

    it("should throw error when updating to existing domain", async () => {
      await createTenantHelper(1);
      const store2 = await createTenantHelper(2);

      const input: UpdateTenantInput = {
        subdomain: "store1",
      };

      await expect(service.updateTenant(store2.id, input)).rejects.toThrow(
        SubdomainInUseError,
      );
    });

    it("should allow updating to same domain for same tenant", async () => {
      const created = await service.createTenant(
        {
          name: "Test Store",
          merchantEmail: "test@example.com",
          subdomain: "teststore",
        },
        "https://mock.base.url",
      );

      const input: UpdateTenantInput = {
        name: "Updated Name",
        subdomain: "teststore", // Same domain
      };

      const updated = await service.updateTenant(created.id, input);

      expect(updated.name).toBe("Updated Name");
      expect(updated.subdomain).toBe("teststore");
    });
  });

  describe("deleteTenant", () => {
    it("should delete tenant successfully", async () => {
      const created = await service.createTenant(
        {
          name: "Test Store",
          merchantEmail: "test@example.com",
          subdomain: "teststore",
        },
        "https://mock.base.url",
      );

      await expect(service.deleteTenant(created.id)).resolves.toBeUndefined();

      await expect(service.getTenant(created.id)).rejects.toThrow(
        TenantNotFoundError,
      );
    });

    it("should throw error when tenant not found", async () => {
      await expect(service.deleteTenant(randomUUID())).rejects.toThrow(
        TenantNotFoundError,
      );
    });
  });

  describe("logProvisioningEvent", () => {
    it("should delegate to repository", async () => {
      const tenantId = "tenant-123";
      const step = "test_step";
      const status = "completed";
      const details = { foo: "bar" };

      // Mock repository method
      repository.logProvisioningEvent = vi.fn().mockResolvedValue(void 0);

      await service.logProvisioningEvent(tenantId, step, status, details);

      expect(repository.logProvisioningEvent).toHaveBeenCalledWith(
        tenantId,
        step,
        status,
        details,
      );
    });
  });

  describe("listTenants", () => {
    it("should return all tenants", async () => {
      await createTenantHelper(1);
      await createTenantHelper(2);
      await createTenantHelper(3);

      const tenants = await service.listTenants();

      expect(tenants).toHaveLength(3);
      expect(tenants.map((t) => t.name)).toEqual([
        "Store 1",
        "Store 2",
        "Store 3",
      ]);
    });

    it("should return empty array when no tenants exist", async () => {
      const tenants = await service.listTenants();

      expect(tenants).toEqual([]);
    });

    it("should not return deleted tenants", async () => {
      const store1 = await createTenantHelper(1);
      await createTenantHelper(2);
      await service.deleteTenant(store1.id);

      const tenants = await service.listTenants();

      expect(tenants).toHaveLength(1);
      expect(tenants[0]?.name).toBe("Store 2");
    });
  });
});
