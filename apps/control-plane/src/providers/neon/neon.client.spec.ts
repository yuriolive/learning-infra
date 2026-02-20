import { cache } from "@vendin/cache";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockLogger } from "../../../tests/utils/test-utilities";
import { NeonProvider } from "./neon.client";
import type { Logger } from "../../utils/logger";

// Mock dependencies
const mockCreateProject = vi.fn();
const mockDeleteProject = vi.fn();
const mockCreateProjectBranch = vi.fn();
const mockRestoreProjectBranch = vi.fn();
const mockListProjectBranches = vi.fn();

vi.mock("@neondatabase/api-client", () => ({
  createApiClient: () => ({
    createProject: mockCreateProject,
    deleteProject: mockDeleteProject,
    createProjectBranch: mockCreateProjectBranch,
    restoreProjectBranch: mockRestoreProjectBranch,
    listProjectBranches: mockListProjectBranches,
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
    orgId: "test-org-id",
    logger: mockLogger as unknown as Logger,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new NeonProvider(config);
  });

  describe("createTenantProject", () => {
    it("should successfully create a tenant project", async () => {
      const tenantId = "tenant-123";

      mockCreateProject.mockResolvedValue({
        data: {
          project: { id: "project-123" },
          connection_uris: [{ connection_uri: "postgres://..." }]
        },
      });

      const result = await provider.createTenantProject(tenantId);

      expect(mockCreateProject).toHaveBeenCalledWith({
        project: {
          name: `tenant-${tenantId}`,
          org_id: "test-org-id",
        },
      });
      expect(result).toEqual({
        projectId: "project-123",
        connectionString: "postgres://...",
      });
    });

    it("should throw if no project ID returned", async () => {
        const tenantId = "tenant-123";
        mockCreateProject.mockResolvedValue({
            data: { project: {}, connection_uris: [] }
        });
        await expect(provider.createTenantProject(tenantId)).rejects.toThrow();
    });
  });

  describe("deleteTenantProject", () => {
      it("should delete project", async () => {
          const projectId = "p-123";
          mockDeleteProject.mockResolvedValue({});
          await provider.deleteTenantProject(projectId);
          expect(mockDeleteProject).toHaveBeenCalledWith(projectId);
      });
  });
});
