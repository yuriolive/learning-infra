import { randomUUID } from "node:crypto";

import { createLogger } from "@vendin/utils/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock NeonProvider
vi.mock("../../../src/providers/neon/neon.client", () => {
  return {
    NeonProvider: vi.fn().mockImplementation(() => ({
      createTenantDatabase: vi.fn().mockResolvedValue("postgres://mock-db-url"),
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
    })),
  };
});

import { TenantRepository } from "../../../src/domains/tenants/tenant.repository";
import { TenantService } from "../../../src/domains/tenants/tenant.service";
import { NeonProvider } from "../../../src/providers/neon/neon.client";
import { createMockDatabase } from "../../utils/mock-database";

import type {
  CreateTenantInput,
  UpdateTenantInput,
} from "../../../src/domains/tenants/tenant.types";

describe("TenantService", () => {
  let service: TenantService;
  let repository: TenantRepository;

  beforeEach(async () => {
    // Reset mocks and env vars
    vi.clearAllMocks();
    const logger = createLogger({ logLevel: "silent", nodeEnv: "test" });
    const database = await createMockDatabase();
    repository = new TenantRepository(database);
    service = new TenantService(repository, {
      logger,
      neonApiKey: "mock-key",
      neonProjectId: "mock-project",
      gcpCredentialsJson: "{}",
      gcpProjectId: "mock-gcp-project",
      gcpRegion: "mock-region",
      tenantImageTag: "mock-tag",
    });
  });

  describe("createTenant", () => {
    it("should create a tenant successfully", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      };

      const tenant = await service.createTenant(input);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe("Test Store");
      expect(tenant.subdomain).toBe("teststore");
      expect(tenant.status).toBe("provisioning");
    });

    it("should provision database if credentials are present", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      };

      let backgroundTask: Promise<unknown> | undefined;
      const waitUntil = (p: Promise<unknown>) => {
        backgroundTask = p;
      };

      const tenant = await service.createTenant(input, waitUntil);

      // Await background task
      if (backgroundTask) await backgroundTask;

      // Verify that databaseUrl was updated
      const updatedTenant = await service.getTenant(tenant.id);
      expect(updatedTenant.databaseUrl).toBe("postgres://mock-db-url");
      expect(updatedTenant.status).toBe("active");
    });

    it("should set status to provisioning_failed if provisioning fails", async () => {
      // Mock failure
      const mockCreateTenantDatabase = vi
        .fn()
        .mockRejectedValue(new Error("Provisioning failed"));
      // @ts-expect-error Mocking for test purposes
      NeonProvider.mockImplementationOnce(() => ({
        createTenantDatabase: mockCreateTenantDatabase,
      }));

      // Re-initialize service with failed provider
      const logger = createLogger({ logLevel: "silent", nodeEnv: "test" });
      const database = await createMockDatabase();
      repository = new TenantRepository(database);
      service = new TenantService(repository, {
        logger,
        neonApiKey: "mock-key",
        neonProjectId: "mock-project",
        gcpCredentialsJson: "{}",
        gcpProjectId: "mock-gcp-project",
        gcpRegion: "mock-region",
        tenantImageTag: "mock-tag",
      });

      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      };

      let backgroundTask: Promise<unknown> | undefined;
      const waitUntil = (p: Promise<unknown>) => {
        backgroundTask = p;
      };

      await service.createTenant(input, waitUntil);

      // Await background task (ignore rejection as service catches it)
      if (backgroundTask) {
        try {
          await backgroundTask;
        } catch {
          // ignore
        }
      }

      // Verify status is provisioning_failed
      const tenants = await service.listTenants();
      expect(tenants).toHaveLength(1);
      expect(tenants[0]?.status).toBe("provisioning_failed");
    });

    it("should throw error when domain already exists", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      };

      await service.createTenant(input);

      await expect(service.createTenant(input)).rejects.toThrow(
        "Subdomain already in use",
      );
    });

    it("should throw error if subdomain is missing", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        // subdomain missing
      };

      await expect(service.createTenant(input)).rejects.toThrow(
        "Subdomain is required",
      );
    });
  });

  describe("getTenant", () => {
    it("should return tenant when found", async () => {
      const created = await service.createTenant({
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      });

      const tenant = await service.getTenant(created.id);

      expect(tenant.id).toBe(created.id);
      expect(tenant.name).toBe("Test Store");
    });

    it("should throw error when tenant not found", async () => {
      await expect(service.getTenant(randomUUID())).rejects.toThrow(
        "Tenant not found",
      );
    });
  });

  describe("updateTenant", () => {
    it("should update tenant successfully", async () => {
      const created = await service.createTenant({
        name: "Original Name",
        merchantEmail: "test@example.com",
        subdomain: "original",
      });

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
        "Tenant not found",
      );
    });

    it("should throw error when updating to existing domain", async () => {
      await service.createTenant({
        name: "Store 1",
        merchantEmail: "store1@example.com",
        subdomain: "store1",
      });
      const store2 = await service.createTenant({
        name: "Store 2",
        merchantEmail: "store2@example.com",
        subdomain: "store2",
      });

      const input: UpdateTenantInput = {
        subdomain: "store1",
      };

      await expect(service.updateTenant(store2.id, input)).rejects.toThrow(
        "Subdomain already in use",
      );
    });

    it("should allow updating to same domain for same tenant", async () => {
      const created = await service.createTenant({
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      });

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
      const created = await service.createTenant({
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      });

      await expect(service.deleteTenant(created.id)).resolves.toBeUndefined();

      await expect(service.getTenant(created.id)).rejects.toThrow(
        "Tenant not found",
      );
    });

    it("should throw error when tenant not found", async () => {
      await expect(service.deleteTenant(randomUUID())).rejects.toThrow(
        "Tenant not found",
      );
    });
  });

  describe("listTenants", () => {
    it("should return all tenants", async () => {
      await service.createTenant({
        name: "Store 1",
        merchantEmail: "store1@example.com",
        subdomain: "store1",
      });
      await service.createTenant({
        name: "Store 2",
        merchantEmail: "store2@example.com",
        subdomain: "store2",
      });
      await service.createTenant({
        name: "Store 3",
        merchantEmail: "store3@example.com",
        subdomain: "store3",
      });

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
      const store1 = await service.createTenant({
        name: "Store 1",
        merchantEmail: "store1@example.com",
        subdomain: "store1",
      });
      await service.createTenant({
        name: "Store 2",
        merchantEmail: "store2@example.com",
        subdomain: "store2",
      });
      await service.deleteTenant(store1.id);

      const tenants = await service.listTenants();

      expect(tenants).toHaveLength(1);
      expect(tenants[0]?.name).toBe("Store 2");
    });
  });
});
