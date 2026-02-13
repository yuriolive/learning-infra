import { cache } from "@vendin/cache";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { mockLogger } from "../../../tests/utils/test-utilities";

import { NeonProvider } from "./neon.client";

import type { Logger } from "../../utils/logger";

// Mock dependencies
const mockListProjectBranches = vi.fn();
const mockListProjectBranchEndpoints = vi.fn();
const mockCreateProjectBranchRole = vi.fn();
const mockCreateProjectBranchDatabase = vi.fn();
const mockDeleteProjectBranchDatabase = vi.fn();
const mockDeleteProjectBranchRole = vi.fn();

vi.mock("@neondatabase/api-client", () => ({
  createApiClient: () => ({
    listProjectBranches: mockListProjectBranches,
    listProjectBranchEndpoints: mockListProjectBranchEndpoints,
    createProjectBranchRole: mockCreateProjectBranchRole,
    createProjectBranchDatabase: mockCreateProjectBranchDatabase,
    deleteProjectBranchDatabase: mockDeleteProjectBranchDatabase,
    deleteProjectBranchRole: mockDeleteProjectBranchRole,
  }),
}));

vi.mock("@vendin/cache", () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe("NeonProvider", () => {
  let provider: NeonProvider;
  const config = {
    apiKey: "test-api-key",
    projectId: "test-project-id",
    logger: mockLogger as unknown as Logger,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new NeonProvider(config);
  });

  describe("createTenantDatabase", () => {
    it("should successfully create a tenant database", async () => {
      const tenantId = "tenant-123";

      // Mock getProjectDefaultBranch
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        "main",
      );

      // Mock listProjectBranchEndpoints
      mockListProjectBranchEndpoints.mockResolvedValue({
        data: {
          endpoints: [{ host: "ep-test.neon.tech" }],
        },
      });

      // Mock createProjectBranchRole
      mockCreateProjectBranchRole.mockResolvedValue({
        data: {
          role: { password: "secure-password" },
        },
      });

      // Mock createProjectBranchDatabase
      mockCreateProjectBranchDatabase.mockResolvedValue({});

      const result = await provider.createTenantDatabase(tenantId);

      expect(result).toBe(
        "postgres://user_tenant_123:secure-password@ep-test.neon.tech/db_tenant_123?sslmode=require",
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.anything(),
        "Creating Neon database for tenant",
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.anything(),
        "Successfully provisioned Neon database",
      );
    });

    it("should fetch default branch if not in cache", async () => {
      const tenantId = "tenant-123";
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      mockListProjectBranches.mockResolvedValue({
        data: {
          branches: [
            { id: "dev", default: false },
            { id: "main-branch", default: true },
          ],
        },
      });

      mockListProjectBranchEndpoints.mockResolvedValue({
        data: { endpoints: [{ host: "host" }] },
      });
      mockCreateProjectBranchRole.mockResolvedValue({
        data: { role: { password: "pw" } },
      });

      await provider.createTenantDatabase(tenantId);

      expect(mockListProjectBranches).toHaveBeenCalledWith({
        projectId: config.projectId,
      });
      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining("default-branch"),
        "main-branch",
        expect.any(Object),
      );
    });

    it("should default to 'production' branch if no default branch found", async () => {
      const tenantId = "tenant-123";
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      mockListProjectBranches.mockResolvedValue({
        data: {
          branches: [{ id: "dev", default: false }],
        },
      });

      mockListProjectBranchEndpoints.mockResolvedValue({
        data: { endpoints: [{ host: "host" }] },
      });
      mockCreateProjectBranchRole.mockResolvedValue({
        data: { role: { password: "pw" } },
      });

      await provider.createTenantDatabase(tenantId);

      expect(cache.set).toHaveBeenCalledWith(
        expect.anything(),
        "production",
        expect.anything(),
      );
    });

    it("should throw if no endpoint found for branch", async () => {
      const tenantId = "tenant-123";
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        "main",
      );

      mockListProjectBranchEndpoints.mockResolvedValue({
        data: { endpoints: [] },
      });

      await expect(provider.createTenantDatabase(tenantId)).rejects.toThrow(
        "No endpoint found for the branch: main",
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should throw if role creation returns no password", async () => {
      const tenantId = "tenant-123";
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        "main",
      );
      mockListProjectBranchEndpoints.mockResolvedValue({
        data: { endpoints: [{ host: "host" }] },
      });

      mockCreateProjectBranchRole.mockResolvedValue({
        data: { role: { password: "" } }, // Empty password
      });

      await expect(provider.createTenantDatabase(tenantId)).rejects.toThrow(
        "Failed to obtain password for tenant role",
      );
    });

    it("should log error and rethrow if role creation fails", async () => {
      const tenantId = "tenant-123";
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        "main",
      );
      mockListProjectBranchEndpoints.mockResolvedValue({
        data: { endpoints: [{ host: "host" }] },
      });

      const error = new Error("Role Exists");
      mockCreateProjectBranchRole.mockRejectedValue(error);

      await expect(provider.createTenantDatabase(tenantId)).rejects.toThrow(
        error,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error }),
        "Failed to create role or database",
      );
    });

    it("should handle listProjectBranches error", async () => {
      const tenantId = "tenant-123";
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      const error = new Error("API Error");
      mockListProjectBranches.mockRejectedValue(error);

      await expect(provider.createTenantDatabase(tenantId)).rejects.toThrow(
        error,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.anything(),
        "Failed to list project branches",
      );
    });
  });

  describe("deleteTenantDatabase", () => {
    it("should successfully delete database and role", async () => {
      const tenantId = "tenant-123";
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        "main",
      );

      await provider.deleteTenantDatabase(tenantId);

      expect(mockDeleteProjectBranchDatabase).toHaveBeenCalledWith(
        config.projectId,
        "main",
        "db_tenant_123",
      );
      expect(mockDeleteProjectBranchRole).toHaveBeenCalledWith(
        config.projectId,
        "main",
        "user_tenant_123",
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.anything(),
        "Deleted tenant database",
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.anything(),
        "Deleted tenant role",
      );
    });

    it("should warn but not throw if delete fails with non-404", async () => {
      const tenantId = "tenant-123";
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        "main",
      );

      const error = { status: 500, message: "Server Error" };
      mockDeleteProjectBranchDatabase.mockRejectedValue(error);
      mockDeleteProjectBranchRole.mockRejectedValue(error);

      await provider.deleteTenantDatabase(tenantId);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ error }),
        "Failed to delete database",
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ error }),
        "Failed to delete role",
      );
      // Should not throw
    });

    it("should ignore 404 errors during deletion", async () => {
      const tenantId = "tenant-123";
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        "main",
      );

      const error404 = { status: 404 };
      mockDeleteProjectBranchDatabase.mockRejectedValue(error404);
      mockDeleteProjectBranchRole.mockRejectedValue(error404);

      await provider.deleteTenantDatabase(tenantId);

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should catch unexpected errors during full process", async () => {
      // If getProjectDefaultBranch throws, it should catch in deleteTenantDatabase
      const tenantId = "tenant-123";
      (cache.get as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Cache Error"),
      );

      await provider.deleteTenantDatabase(tenantId);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.anything(),
        "Failed to cleanup Neon resources during rollback",
      );
    });
  });
});
