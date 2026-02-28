import { createLogger } from "@vendin/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NeonProvider } from "../../../../src/providers/neon/neon.client";

vi.mock("@neondatabase/api-client");
vi.mock("@vendin/cache", () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockImplementation(() => Promise.resolve()),
  },
}));

import { createApiClient } from "@neondatabase/api-client";
import { cache } from "@vendin/cache";

const logger = createLogger({ logLevel: "silent" });

const makeBranch = (overrides: Record<string, unknown> = {}) => ({
  id: "branch-main",
  name: "main",
  default: true,
  ...overrides,
});

describe("NeonProvider", () => {
  let mockClient: {
    createProject: ReturnType<typeof vi.fn>;
    deleteProject: ReturnType<typeof vi.fn>;
    createProjectBranch: ReturnType<typeof vi.fn>;
    listProjectBranches: ReturnType<typeof vi.fn>;
    restoreProjectBranch: ReturnType<typeof vi.fn>;
  };
  let provider: NeonProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      createProject: vi.fn(),
      deleteProject: vi.fn().mockResolvedValue({}),
      createProjectBranch: vi.fn(),
      listProjectBranches: vi.fn(),
      restoreProjectBranch: vi.fn().mockResolvedValue({}),
    };

    vi.mocked(createApiClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createApiClient>,
    );

    provider = new NeonProvider({ apiKey: "test-key", logger });
  });

  // ---------------------------------------------------------------------------
  describe("createTenantProject", () => {
    it("should return projectId and connectionString on success", async () => {
      mockClient.createProject.mockResolvedValue({
        data: {
          project: { id: "proj-1" },
          connection_uris: [{ connection_uri: "postgres://conn" }],
        },
      });

      const result = await provider.createTenantProject("tenant-1");

      expect(result).toEqual({
        projectId: "proj-1",
        connectionString: "postgres://conn",
      });
      expect(mockClient.createProject).toHaveBeenCalledWith({
        project: { name: "tenant-tenant-1" },
      });
    });

    it("should include org_id when configured", async () => {
      provider = new NeonProvider({
        apiKey: "test-key",
        orgId: "org-abc",
        logger,
      });
      mockClient.createProject.mockResolvedValue({
        data: {
          project: { id: "proj-2" },
          connection_uris: [{ connection_uri: "postgres://conn" }],
        },
      });

      await provider.createTenantProject("tenant-2");

      expect(mockClient.createProject).toHaveBeenCalledWith({
        project: { name: "tenant-tenant-2", org_id: "org-abc" },
      });
    });

    it("should throw if project id or connection URI is missing", async () => {
      mockClient.createProject.mockResolvedValue({
        data: { project: {}, connection_uris: [] },
      });

      await expect(provider.createTenantProject("tenant-1")).rejects.toThrow(
        "Failed to retrieve project ID or connection URI",
      );
    });
  });

  // ---------------------------------------------------------------------------
  describe("deleteTenantProject", () => {
    it("should delete the project", async () => {
      await provider.deleteTenantProject("proj-1");
      expect(mockClient.deleteProject).toHaveBeenCalledWith("proj-1");
    });

    it("should swallow 404 errors", async () => {
      mockClient.deleteProject.mockRejectedValue({ status: 404 });

      await expect(
        provider.deleteTenantProject("proj-missing"),
      ).resolves.not.toThrow();
    });

    it("should rethrow non-404 errors", async () => {
      mockClient.deleteProject.mockRejectedValue({ status: 500 });

      await expect(
        provider.deleteTenantProject("proj-1"),
      ).rejects.toMatchObject({ status: 500 });
    });
  });

  // ---------------------------------------------------------------------------
  describe("createSnapshot", () => {
    it("should return the new branch id", async () => {
      mockClient.listProjectBranches.mockResolvedValue({
        data: { branches: [makeBranch()] },
      });
      mockClient.createProjectBranch.mockResolvedValue({
        data: { branch: { id: "snap-branch-1" } },
      });

      const id = await provider.createSnapshot("proj-1", "snap-before-v2");

      expect(id).toBe("snap-branch-1");
      expect(mockClient.createProjectBranch).toHaveBeenCalledWith("proj-1", {
        branch: { name: "snap-before-v2", parent_id: "branch-main" },
      });
    });

    it("should use cached default branch id", async () => {
      vi.mocked(cache.get).mockResolvedValue("cached-branch-id");
      mockClient.createProjectBranch.mockResolvedValue({
        data: { branch: { id: "snap-branch-2" } },
      });

      await provider.createSnapshot("proj-1", "snap-2");

      expect(mockClient.listProjectBranches).not.toHaveBeenCalled();
      expect(mockClient.createProjectBranch).toHaveBeenCalledWith("proj-1", {
        branch: { name: "snap-2", parent_id: "cached-branch-id" },
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe("restoreFromSnapshot", () => {
    it("should restore main branch from snapshot branch", async () => {
      // First listProjectBranches call resolves default branch (for getProjectDefaultBranch)
      // Second call resolves snapshot branch (for getBranchIdByName)
      mockClient.listProjectBranches
        .mockResolvedValueOnce({
          data: { branches: [makeBranch()] },
        })
        .mockResolvedValueOnce({
          data: {
            branches: [
              makeBranch({ default: false }),
              { id: "snap-id", name: "snap-before-v2", default: false },
            ],
          },
        });

      await provider.restoreFromSnapshot("proj-1", "snap-before-v2");

      expect(mockClient.restoreProjectBranch).toHaveBeenCalledWith(
        "proj-1",
        "branch-main",
        { source_branch_id: "snap-id" },
      );
    });

    it("should throw if snapshot branch not found", async () => {
      mockClient.listProjectBranches
        .mockResolvedValueOnce({
          data: { branches: [makeBranch()] },
        })
        .mockResolvedValueOnce({
          data: { branches: [makeBranch()] }, // no matching snapshot name
        });

      await expect(
        provider.restoreFromSnapshot("proj-1", "nonexistent-snap"),
      ).rejects.toThrow("Snapshot branch 'nonexistent-snap' not found");
    });
  });
});
