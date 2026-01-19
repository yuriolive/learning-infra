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
import { createTenantRoutes } from "../../../src/domains/tenants/tenant.routes";
import { TenantService } from "../../../src/domains/tenants/tenant.service";

describe("TenantRoutes", () => {
  let routes: ReturnType<typeof createTenantRoutes>;
  let service: TenantService;
  let repository: TenantRepository;

  beforeEach(() => {
    repository = new TenantRepository();
    service = new TenantService(repository);
    routes = createTenantRoutes({ tenantService: service });
  });

  describe("POST /api/tenants", () => {
    it("should create a tenant successfully", async () => {
      const request = new Request("http://localhost:3000/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Store",
          domain: "teststore",
        }),
      });

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.name).toBe("Test Store");
      expect(data.domain).toBe("teststore");
      expect(data.status).toBe("active");
    });

    it("should return 400 for invalid input", async () => {
      const request = new Request("http://localhost:3000/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "", // Invalid: empty name
        }),
      });

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation error");
      expect(data.details).toBeDefined();
    });

    it("should return 409 for duplicate domain", async () => {
      await service.createTenant({
        name: "Existing Store",
        domain: "teststore",
      });

      const request = new Request("http://localhost:3000/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Store",
          domain: "teststore", // Duplicate domain
        }),
      });

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Domain already in use");
    });
  });

  describe("GET /api/tenants", () => {
    it("should return list of tenants", async () => {
      await service.createTenant({ name: "Store 1" });
      await service.createTenant({ name: "Store 2" });

      const request = new Request("http://localhost:3000/api/tenants", {
        method: "GET",
      });

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    it("should return empty array when no tenants exist", async () => {
      const request = new Request("http://localhost:3000/api/tenants", {
        method: "GET",
      });

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("GET /api/tenants/:tenantId", () => {
    it("should return tenant when found", async () => {
      const created = await service.createTenant({ name: "Test Store" });

      const request = new Request(
        `http://localhost:3000/api/tenants/${created.id}`,
        {
          method: "GET",
        },
      );

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(created.id);
      expect(data.name).toBe("Test Store");
    });

    it("should return 404 when tenant not found", async () => {
      const request = new Request(
        "http://localhost:3000/api/tenants/550e8400-e29b-41d4-a716-446655440000",
        {
          method: "GET",
        },
      );

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Tenant not found");
    });

    it("should return 400 for invalid tenant ID format", async () => {
      const request = new Request(
        "http://localhost:3000/api/tenants/invalid-id",
        {
          method: "GET",
        },
      );

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation error");
    });
  });

  describe("PATCH /api/tenants/:tenantId", () => {
    it("should update tenant successfully", async () => {
      const created = await service.createTenant({ name: "Original Name" });

      const request = new Request(
        `http://localhost:3000/api/tenants/${created.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Updated Name",
            status: "suspended",
          }),
        },
      );

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Name");
      expect(data.status).toBe("suspended");
      expect(data.id).toBe(created.id);
    });

    it("should return 404 when tenant not found", async () => {
      const request = new Request(
        "http://localhost:3000/api/tenants/550e8400-e29b-41d4-a716-446655440000",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated Name" }),
        },
      );

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Tenant not found");
    });
  });

  describe("DELETE /api/tenants/:tenantId", () => {
    it("should delete tenant successfully", async () => {
      const created = await service.createTenant({ name: "Test Store" });

      const request = new Request(
        `http://localhost:3000/api/tenants/${created.id}`,
        {
          method: "DELETE",
        },
      );

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 404 when tenant not found", async () => {
      const request = new Request(
        "http://localhost:3000/api/tenants/550e8400-e29b-41d4-a716-446655440000",
        {
          method: "DELETE",
        },
      );

      const response = await routes.handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Tenant not found");
    });
  });

  describe("404 handling", () => {
    it("should return 404 for unknown routes", async () => {
      const request = new Request("http://localhost:3000/api/unknown", {
        method: "GET",
      });

      const response = await routes.handleRequest(request);

      expect(response.status).toBe(404);
    });
  });
});
