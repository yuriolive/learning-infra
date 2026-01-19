import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import type { CreateTenantInput } from "../../../src/domains/tenants/tenant.types";

describe("TenantRepository", () => {
  let repository: TenantRepository;

  beforeEach(() => {
    repository = new TenantRepository();
  });

  afterEach(() => {
    // Repository uses in-memory storage, so each test gets a fresh instance
  });

  describe("create", () => {
    it("should create a tenant with all required fields", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        domain: "teststore",
        metadata: { customField: "value" },
      };

      const tenant = await repository.create(input);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe("Test Store");
      expect(tenant.domain).toBe("teststore");
      expect(tenant.status).toBe("active");
      expect(tenant.metadata).toEqual({ customField: "value" });
      expect(tenant.createdAt).toBeInstanceOf(Date);
      expect(tenant.updatedAt).toBeInstanceOf(Date);
      expect(tenant.deletedAt).toBeUndefined();
    });

    it("should create a tenant without optional fields", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
      };

      const tenant = await repository.create(input);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe("Test Store");
      expect(tenant.domain).toBeUndefined();
      expect(tenant.metadata).toBeUndefined();
      expect(tenant.status).toBe("active");
    });
  });

  describe("findById", () => {
    it("should return tenant when found", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
      };

      const created = await repository.create(input);
      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Test Store");
    });

    it("should return null when tenant not found", async () => {
      const found = await repository.findById("non-existent-id");

      expect(found).toBeNull();
    });

    it("should return null for deleted tenants", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
      };

      const created = await repository.create(input);
      await repository.softDelete(created.id);
      const found = await repository.findById(created.id);

      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return all non-deleted tenants", async () => {
      await repository.create({ name: "Store 1" });
      await repository.create({ name: "Store 2" });
      const store3 = await repository.create({ name: "Store 3" });

      await repository.softDelete(store3.id);

      const tenants = await repository.findAll();

      expect(tenants).toHaveLength(2);
      expect(tenants.map((t) => t.name)).toEqual(["Store 1", "Store 2"]);
    });

    it("should return empty array when no tenants exist", async () => {
      const tenants = await repository.findAll();

      expect(tenants).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update tenant fields", async () => {
      const created = await repository.create({ name: "Original Name" });

      const updated = await repository.update(created.id, {
        name: "Updated Name",
        status: "suspended",
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe("Updated Name");
      expect(updated?.status).toBe("suspended");
      expect(updated?.id).toBe(created.id);
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime(),
      );
    });

    it("should return null when tenant not found", async () => {
      const updated = await repository.update("non-existent-id", {
        name: "New Name",
      });

      expect(updated).toBeNull();
    });

    it("should return null for deleted tenants", async () => {
      const created = await repository.create({ name: "Test Store" });
      await repository.softDelete(created.id);

      const updated = await repository.update(created.id, { name: "New Name" });

      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should mark tenant as deleted", async () => {
      const created = await repository.create({ name: "Test Store" });

      const deleted = await repository.softDelete(created.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();

      const allTenants = await repository.findAll();
      expect(allTenants).toHaveLength(0);
    });

    it("should return false when tenant not found", async () => {
      const deleted = await repository.softDelete("non-existent-id");

      expect(deleted).toBe(false);
    });

    it("should return false when tenant already deleted", async () => {
      const created = await repository.create({ name: "Test Store" });
      await repository.softDelete(created.id);

      const deleted = await repository.softDelete(created.id);

      expect(deleted).toBe(false);
    });
  });

  describe("findByDomain", () => {
    it("should return tenant when domain matches", async () => {
      const created = await repository.create({
        name: "Test Store",
        domain: "teststore",
      });

      const found = await repository.findByDomain("teststore");

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.domain).toBe("teststore");
    });

    it("should return null when domain not found", async () => {
      const found = await repository.findByDomain("nonexistent");

      expect(found).toBeNull();
    });

    it("should return null for deleted tenants", async () => {
      const created = await repository.create({
        name: "Test Store",
        domain: "teststore",
      });

      await repository.softDelete(created.id);

      const found = await repository.findByDomain("teststore");

      expect(found).toBeNull();
    });
  });
});
