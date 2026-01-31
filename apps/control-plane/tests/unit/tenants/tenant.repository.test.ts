import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { TenantRepository } from "../../../src/domains/tenants/tenant.repository";
import { createMockDatabase } from "../../utils/mock-database";

import type { CreateTenantInput } from "../../../src/domains/tenants/tenant.types";

describe("TenantRepository", () => {
  let repository: TenantRepository;

  beforeEach(async () => {
    const database = await createMockDatabase();
    repository = new TenantRepository(database);
  });

  describe("create", () => {
    it("should create a tenant with all required fields", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
        metadata: { customField: "value" },
      };

      const tenant = await repository.create(input);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe("Test Store");
      expect(tenant.merchantEmail).toBe("test@example.com");
      expect(tenant.subdomain).toBe("teststore");
      expect(tenant.status).toBe("provisioning");
      expect(tenant.metadata).toEqual({ customField: "value" });
      expect(tenant.createdAt).toBeInstanceOf(Date);
      expect(tenant.updatedAt).toBeInstanceOf(Date);
      expect(tenant.deletedAt).toBeNull();
    });

    it("should create a tenant without optional fields", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
      };

      const tenant = await repository.create(input);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe("Test Store");
      expect(tenant.subdomain).toBeNull();
      expect(tenant.metadata).toBeNull();
      expect(tenant.status).toBe("provisioning");
    });
  });

  describe("findById", () => {
    it("should return tenant when found", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
      };

      const created = await repository.create(input);
      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Test Store");
    });

    it("should return null when tenant not found", async () => {
      const found = await repository.findById(randomUUID());

      expect(found).toBeNull();
    });

    it("should return null for deleted tenants", async () => {
      const input: CreateTenantInput = {
        name: "Test Store",
        merchantEmail: "test@example.com",
      };

      const created = await repository.create(input);
      await repository.softDelete(created.id);
      const found = await repository.findById(created.id);

      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return all non-deleted tenants", async () => {
      await repository.create({
        name: "Store 1",
        merchantEmail: "store1@example.com",
      });
      await repository.create({
        name: "Store 2",
        merchantEmail: "store2@example.com",
      });
      const store3 = await repository.create({
        name: "Store 3",
        merchantEmail: "store3@example.com",
      });

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
      const created = await repository.create({
        name: "Original Name",
        merchantEmail: "test@example.com",
      });

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

    it("should update redisHash", async () => {
      const created = await repository.create({
        name: "Store with Redis",
        merchantEmail: "test@example.com",
      });

      const updated = await repository.update(created.id, {
        redisHash: "abc123def456",
      });

      expect(updated).not.toBeNull();
      expect(updated?.redisHash).toBe("abc123def456");

      const found = await repository.findById(created.id);
      expect(found?.redisHash).toBe("abc123def456");
    });

    it("should return null when tenant not found", async () => {
      const updated = await repository.update(randomUUID(), {
        name: "New Name",
      });

      expect(updated).toBeNull();
    });

    it("should return null for deleted tenants", async () => {
      const created = await repository.create({
        name: "Test Store",
        merchantEmail: "test@example.com",
      });
      await repository.softDelete(created.id);

      const updated = await repository.update(created.id, { name: "New Name" });

      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should mark tenant as deleted", async () => {
      const created = await repository.create({
        name: "Test Store",
        merchantEmail: "test@example.com",
      });

      const deleted = await repository.softDelete(created.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();

      const allTenants = await repository.findAll();
      expect(allTenants).toHaveLength(0);
    });

    it("should return false when tenant not found", async () => {
      const deleted = await repository.softDelete(randomUUID());

      expect(deleted).toBe(false);
    });

    it("should return false when tenant already deleted", async () => {
      const created = await repository.create({
        name: "Test Store",
        merchantEmail: "test@example.com",
      });
      await repository.softDelete(created.id);

      const deleted = await repository.softDelete(created.id);

      expect(deleted).toBe(false);
    });
  });

  describe("findBySubdomain", () => {
    it("should return tenant when subdomain matches", async () => {
      const created = await repository.create({
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      });

      const found = await repository.findBySubdomain("teststore");

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.subdomain).toBe("teststore");
    });

    it("should return null when subdomain not found", async () => {
      const found = await repository.findBySubdomain("nonexistent");

      expect(found).toBeNull();
    });

    it("should return null for deleted tenants", async () => {
      const created = await repository.create({
        name: "Test Store",
        merchantEmail: "test@example.com",
        subdomain: "teststore",
      });

      await repository.softDelete(created.id);

      const found = await repository.findBySubdomain("teststore");

      expect(found).toBeNull();
    });
  });
});
