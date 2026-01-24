import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock 'bun' module before importing index
vi.mock("bun", () => {
  return {
    serve: vi.fn(() => ({ port: 3000 })),
  };
});

import { createLogger } from "@vendin/utils/logger";

import { createTenantRoutes } from "../../src/domains/tenants/tenant.routes";
import { handleRequest } from "../../src/index";

// Mock dependencies
const mockLogger = createLogger({ nodeEnv: "test" });
const mockTenantService = {
  createTenant: vi.fn(),
  getTenant: vi.fn(),
  listTenants: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
} as any;

const mockTenantRoutes = createTenantRoutes({
  logger: mockLogger,
  tenantService: mockTenantService,
});

describe("Control Plane Security Integration", () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnvironment };
    process.env.ADMIN_API_KEY = "test-secret-key";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  describe("Public Endpoints", () => {
    it("GET /health should be accessible without auth", async () => {
      const request = new Request("http://localhost:3000/health");
      const response = await handleRequest(request, mockTenantRoutes);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("ok");
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("GET /openapi.json should be accessible without auth", async () => {
      const request = new Request("http://localhost:3000/openapi.json");
      const response = await handleRequest(request, mockTenantRoutes);
      expect(response.status).toBe(200);
    });
  });

  describe("Protected Endpoints (/api/tenants)", () => {
    it("should return 401 if Authorization header is missing", async () => {
      const request = new Request("http://localhost:3000/api/tenants");
      const response = await handleRequest(request, mockTenantRoutes);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 401 if Authorization header is invalid", async () => {
      const request = new Request("http://localhost:3000/api/tenants", {
        headers: { Authorization: "Bearer wrong-token" },
      });
      const response = await handleRequest(request, mockTenantRoutes);

      expect(response.status).toBe(401);
    });

    it("should allow access with correct Bearer token", async () => {
      // Mock the route handler to return success so we know auth passed
      mockTenantRoutes.handleRequest = vi
        .fn()
        .mockResolvedValue(new Response("OK", { status: 200 }));

      const request = new Request("http://localhost:3000/api/tenants", {
        headers: { Authorization: "Bearer test-secret-key" },
      });
      const response = await handleRequest(request, mockTenantRoutes);

      expect(response.status).not.toBe(401);
    });
  });

  describe("CORS Headers", () => {
    it("should return Access-Control-Allow-Origin: * in test/dev env", async () => {
      process.env.NODE_ENV = "development";
      const request = new Request("http://localhost:3000/health");
      const response = await handleRequest(request, mockTenantRoutes);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("should restrict Origin in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "http://trusted.com";

      const request = new Request("http://localhost:3000/health", {
        headers: { Origin: "http://trusted.com" },
      });
      const response = await handleRequest(request, mockTenantRoutes);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://trusted.com",
      );
    });

    it("should not set Access-Control-Allow-Origin if origin not allowed in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "http://trusted.com";

      const request = new Request("http://localhost:3000/health", {
        headers: { Origin: "http://evil.com" },
      });
      const response = await handleRequest(request, mockTenantRoutes);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });
});
