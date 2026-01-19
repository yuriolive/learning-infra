import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database before any imports
vi.mock("../../../src/database/database", () => ({
  database: {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

import { TenantRepository } from "../../../src/domains/tenants/tenant.repository";
import { TenantService } from "../../../src/domains/tenants/tenant.service";

import type {
  CreateTenantInput,
  UpdateTenantInput,
} from "../../../src/domains/tenants/tenant.types";

describe("TenantService", () => {
  let service: TenantService;
  let repository: TenantRepository;

  beforeEach(() => {
    repository = new TenantRepository();
    service = new TenantService(repository);
  });

  describe("createTenant", () => {
    it("should create a tenant successfully", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        domain: "teststore",
      };

      const tenant = await service.createTenant(input);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe("Test Store");
      expect(tenant.domain).toBe("teststore");
      expect(tenant.status).toBe("active");
    });

    it("should throw error when domain already exists", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
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
      };

      const tenant = await service.createTenant(input);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe("Test Store");
      expect(tenant.domain).toBeUndefined();
    });
  });

  describe("getTenant", () => {
    it("should return tenant when found", async () => {
      const created = await service.createTenant({ name: "Test Store" });

      const tenant = await service.getTenant(created.id);

      expect(tenant.id).toBe(created.id);
      expect(tenant.name).toBe("Test Store");
    });

    it("should throw error when tenant not found", async () => {
      await expect(service.getTenant("non-existent-id")).rejects.toThrow(
        "Tenant not found",
      );
    });
  });

  describe("updateTenant", () => {
    it("should update tenant successfully", async () => {
      const created = await service.createTenant({ name: "Original Name" });

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

      await expect(
        service.updateTenant("non-existent-id", input),
      ).rejects.toThrow("Tenant not found");
    });

    it("should throw error when updating to existing domain", async () => {
      await service.createTenant({ name: "Store 1", domain: "store1" });
      const store2 = await service.createTenant({
        name: "Store 2",
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
      const created = await service.createTenant({ name: "Test Store" });

      await expect(service.deleteTenant(created.id)).resolves.toBeUndefined();

      await expect(service.getTenant(created.id)).rejects.toThrow(
        "Tenant not found",
      );
    });

    it("should throw error when tenant not found", async () => {
      await expect(service.deleteTenant("non-existent-id")).rejects.toThrow(
        "Tenant not found",
      );
    });
  });

  describe("listTenants", () => {
    it("should return all tenants", async () => {
      await service.createTenant({ name: "Store 1" });
      await service.createTenant({ name: "Store 2" });
      await service.createTenant({ name: "Store 3" });

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
      const store1 = await service.createTenant({ name: "Store 1" });
      await service.createTenant({ name: "Store 2" });
      await service.deleteTenant(store1.id);

      const tenants = await service.listTenants();

      expect(tenants).toHaveLength(1);
      expect(tenants[0]?.name).toBe("Store 2");
    });
  });
});
