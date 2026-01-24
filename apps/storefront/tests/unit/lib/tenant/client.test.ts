import { beforeAll, describe, expect, it, vi } from "vitest";

// Set environment variables before importing the module
beforeAll(() => {
  process.env.CONTROL_PLANE_API_URL = "https://control.vendin.store";
  process.env.CONTROL_PLANE_API_KEY = "test-api-key";
  process.env.ENABLE_TENANT_CACHE = "true";
  process.env.TENANT_CACHE_TTL = "300";
});

// Mock logger before importing client
vi.mock("@vendin/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Import after mocks are set up
const { fetchTenantBySubdomain, fetchTenantById } =
  await import("../../../../src/lib/tenant/client");

describe("Tenant Client", () => {
  describe("fetchTenantBySubdomain", () => {
    it("should fetch tenant successfully", async () => {
      const mockTenant = {
        id: "tenant-123",
        subdomain: "awesome-store",
        name: "Awesome Store",
        status: "active",
        apiUrl: "https://tenant-123.run.app",
      };

      (globalThis.fetch as any) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTenant),
      });

      const result = await fetchTenantBySubdomain("awesome-store");

      expect(result).toEqual(mockTenant);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://control.vendin.store/api/tenants/lookup?subdomain=awesome-store",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-api-key",
          },
        }),
      );
    });

    it("should return null for 404 response", async () => {
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await fetchTenantBySubdomain("non-existent");

      expect(result).toBeNull();
    });

    it("should handle fetch errors gracefully", async () => {
      (globalThis.fetch as any) = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));

      const result = await fetchTenantBySubdomain("test-store");

      expect(result).toBeNull();
    });

    it("should handle non-404 errors", async () => {
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await fetchTenantBySubdomain("test-store");

      expect(result).toBeNull();
    });
  });

  describe("fetchTenantById", () => {
    it("should fetch tenant successfully by ID", async () => {
      const mockTenant = {
        id: "tenant-456",
        subdomain: "another-store",
        name: "Another Store",
        status: "active",
      };

      (globalThis.fetch as any) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTenant),
      });

      const result = await fetchTenantById("tenant-456");

      expect(result).toEqual(mockTenant);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://control.vendin.store/api/tenants/tenant-456",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-api-key",
          },
        }),
      );
    });

    it("should return null for 404 response", async () => {
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await fetchTenantById("non-existent-id");

      expect(result).toBeNull();
    });

    it("should handle fetch errors gracefully", async () => {
      (globalThis.fetch as any) = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));

      const result = await fetchTenantById("test-id");

      expect(result).toBeNull();
    });
  });

  describe("Cache configuration", () => {
    it("should call fetch with proper configuration", async () => {
      (globalThis.fetch as any) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "test", subdomain: "test" }),
      });

      await fetchTenantBySubdomain("test");

      // Verify fetch was called (cache config is internal implementation detail)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tenants/lookup"),
        expect.any(Object),
      );
    });
  });
});
