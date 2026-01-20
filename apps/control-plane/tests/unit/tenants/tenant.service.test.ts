import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { TenantRepository } from "../../../src/domains/tenants/tenant.repository";
import { TenantService } from "../../../src/domains/tenants/tenant.service";
import { NeonProvider } from "../../../src/providers/neon/neon.client";
import { createMockDatabase } from "../../utils/mock-database";

import type {
  CreateTenantInput,
  UpdateTenantInput,
} from "../../../src/domains/tenants/tenant.types";

// Mock NeonProvider
vi.mock("../../../src/providers/neon/neon.client", () => {
  return {
    NeonProvider: vi.fn().mockImplementation(() => ({
      createTenantDatabase: vi.fn().mockResolvedValue("postgres://mock-db-url"),
    })),
  };
});

describe("TenantService", () => {
  let service: TenantService;
  let repository: TenantRepository;

  beforeEach(async () => {
    // Reset mocks and env vars
    vi.clearAllMocks();
    process.env.NEON_API_KEY = "mock-key";
    process.env.NEON_PROJECT_ID = "mock-project";

    const database = await createMockDatabase();
    repository = new TenantRepository(database);
    service = new TenantService(repository);
  });

  describe("createTenant", () => {
    it("should create a tenant successfully", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        domain: "teststore",
      };

      const tenant = await service.createTenant(input);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe("Test Store");
      expect(tenant.domain).toBe("teststore");
      expect(tenant.status).toBe("provisioning");
    });

    it("should provision database if Neon credentials are present", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        domain: "teststore",
      };

      const tenant = await service.createTenant(input);

      // Verify that databaseUrl was updated
      const updatedTenant = await service.getTenant(tenant.id);
      expect(updatedTenant.databaseUrl).toBe("postgres://mock-db-url");
    });

    it("should set status to provisioning_failed if database provisioning fails", async () => {
      // Mock failure
      const mockCreateTenantDatabase = vi
        .fn()
        .mockRejectedValue(new Error("Provisioning failed"));
      // @ts-expect-error Mocking for test purposes
      NeonProvider.mockImplementationOnce(() => ({
        createTenantDatabase: mockCreateTenantDatabase,
      }));

      // Re-initialize service with failed provider
      const database = await createMockDatabase();
      repository = new TenantRepository(database);
      service = new TenantService(repository);

      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        domain: "teststore",
      };

      await expect(service.createTenant(input)).rejects.toThrow(
        "Failed to provision database resource",
      );

      // Verify status is provisioning_failed
      const tenants = await service.listTenants();
      // Since listTenants filters out deleted, we might need to query repository directly or use listTenants if it shows provisioning_failed
      // By default listTenants shows all non-deleted.
      expect(tenants).toHaveLength(1);
      expect(tenants[0]?.status).toBe("provisioning_failed");
    });

    it("should throw error when domain already exists", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        domain: "teststore",
      };

      await service.createTenant(input);

      await expect(service.createTenant(input)).rejects.toThrow(
        "Domain already in use",
      );
    });

    it("should allow creating tenant without domain", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
      };

      const tenant = await service.createTenant(input);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe("Test Store");
      expect(tenant.domain).toBeNull();
    });
  });

  describe("getTenant", () => {
    it("should return tenant when found", async () => {
      const created = await service.createTenant({
        name: "Test Store",
        merchantEmail: "test@example.com",
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
        domain: "store1",
      });
      const store2 = await service.createTenant({
        name: "Store 2",
        merchantEmail: "store2@example.com",
        domain: "store2",
      });

      const input: UpdateTenantInput = {
        domain: "store1",
      };

      await expect(service.updateTenant(store2.id, input)).rejects.toThrow(
        "Domain already in use",
      );
    });

    it("should allow updating to same domain for same tenant", async () => {
      const created = await service.createTenant({
        name: "Test Store",
        merchantEmail: "test@example.com",
        domain: "teststore",
      });

      const input: UpdateTenantInput = {
        name: "Updated Name",
        domain: "teststore", // Same domain
      };

      const updated = await service.updateTenant(created.id, input);

      expect(updated.name).toBe("Updated Name");
      expect(updated.domain).toBe("teststore");
    });
  });

  describe("deleteTenant", () => {
    it("should delete tenant successfully", async () => {
      const created = await service.createTenant({
        name: "Test Store",
        merchantEmail: "test@example.com",
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
      });
      await service.createTenant({
        name: "Store 2",
        merchantEmail: "store2@example.com",
      });
      await service.createTenant({
        name: "Store 3",
        merchantEmail: "store3@example.com",
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
      });
      await service.createTenant({
        name: "Store 2",
        merchantEmail: "store2@example.com",
      });
      await service.deleteTenant(store1.id);

      const tenants = await service.listTenants();

      expect(tenants).toHaveLength(1);
      expect(tenants[0]?.name).toBe("Store 2");
    });
  });
});
