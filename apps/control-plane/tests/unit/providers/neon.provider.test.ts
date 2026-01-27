import { createLogger } from "@vendin/utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { NeonProvider } from "../../../src/providers/neon/neon.client";

// Mock the API client
const mockListProjectBranches = vi.fn();
const mockListProjectBranchEndpoints = vi.fn();
const mockCreateProjectBranchRole = vi.fn();
const mockCreateProjectBranchDatabase = vi.fn();

vi.mock("@neondatabase/api-client", () => ({
  createApiClient: () => ({
    listProjectBranches: mockListProjectBranches,
    listProjectBranchEndpoints: mockListProjectBranchEndpoints,
    createProjectBranchRole: mockCreateProjectBranchRole,
    createProjectBranchDatabase: mockCreateProjectBranchDatabase,
  }),
}));

describe("NeonProvider", () => {
  let provider: NeonProvider;
  const mockLogger = createLogger({ logLevel: "silent", nodeEnv: "test" });

  const createProvider = (projectId: string) => {
    return new NeonProvider({
      apiKey: "test-api-key",
      projectId,
      logger: mockLogger,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch default branch and cache it", async () => {
    const projectId = "project-1";
    provider = createProvider(projectId);

    // Mock API responses
    mockListProjectBranches.mockResolvedValue({
      data: {
        branches: [
          { id: "branch-dev", default: false },
          { id: "branch-main", default: true },
        ],
      },
    });

    mockListProjectBranchEndpoints.mockResolvedValue({
      data: {
        endpoints: [{ host: "test-host.neon.tech" }],
      },
    });

    mockCreateProjectBranchRole.mockResolvedValue({
      data: {
        role: { password: "test-password" },
      },
    });

    mockCreateProjectBranchDatabase.mockResolvedValue({});

    // First call
    await provider.createTenantDatabase("tenant-1");

    expect(mockListProjectBranches).toHaveBeenCalledWith({ projectId });
    expect(mockListProjectBranches).toHaveBeenCalledTimes(1);

    // Check if the correct branch was used in subsequent calls
    expect(mockListProjectBranchEndpoints).toHaveBeenCalledWith(
      projectId,
      "branch-main",
    );
    expect(mockCreateProjectBranchRole).toHaveBeenCalledWith(
      projectId,
      "branch-main",
      expect.any(Object),
    );
    expect(mockCreateProjectBranchDatabase).toHaveBeenCalledWith(
      projectId,
      "branch-main",
      expect.any(Object),
    );

    // Second call - should use cache
    await provider.createTenantDatabase("tenant-2");

    expect(mockListProjectBranches).toHaveBeenCalledTimes(1); // Should still be 1
    expect(mockListProjectBranchEndpoints).toHaveBeenCalledWith(
      projectId,
      "branch-main",
    );
  });

  it('should fallback to "production" if no default branch found', async () => {
    const projectId = "project-2";
    provider = createProvider(projectId);

    mockListProjectBranches.mockResolvedValue({
      data: {
        branches: [
          { id: "branch-dev", default: false },
          { id: "branch-staging", default: false },
        ],
      },
    });

    mockListProjectBranchEndpoints.mockResolvedValue({
      data: {
        endpoints: [{ host: "test-host.neon.tech" }],
      },
    });

    mockCreateProjectBranchRole.mockResolvedValue({
      data: {
        role: { password: "test-password" },
      },
    });

    mockCreateProjectBranchDatabase.mockResolvedValue({});

    await provider.createTenantDatabase("tenant-1");

    expect(mockListProjectBranches).toHaveBeenCalledWith({ projectId });
    // Should default to "production"
    expect(mockListProjectBranchEndpoints).toHaveBeenCalledWith(
      projectId,
      "production",
    );
  });
});
