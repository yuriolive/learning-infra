import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CloudRunProvider } from "./cloud-run.client";

// Mock google-auth-library
vi.mock("google-auth-library", () => ({
  GoogleAuth: vi.fn().mockImplementation(() => ({})),
}));

// Mock googleapis
vi.mock("googleapis", () => {
  const mockGet = vi.fn();
  const mockPatch = vi.fn();
  const mockCreate = vi.fn();
  const mockGetIamPolicy = vi.fn();
  const mockSetIamPolicy = vi.fn();
  const mockGetOperation = vi.fn();

  return {
    run_v2: {
      Run: vi.fn().mockImplementation(() => ({
        projects: {
          locations: {
            services: {
              get: mockGet,
              patch: mockPatch,
              create: mockCreate,
              getIamPolicy: mockGetIamPolicy,
              setIamPolicy: mockSetIamPolicy,
            },
            operations: {
              get: mockGetOperation,
            },
          },
        },
      })),
    },
  };
});

// Mock logger
vi.mock("@vendin/utils/logger", () => ({
  createLogger: vi.fn().mockReturnValue({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe("CloudRunProvider", () => {
  const config = {
    credentialsJson: JSON.stringify({ project_id: "test-project" }),
    projectId: "test-project",
    region: "us-central1",
    tenantImageTag: "gcr.io/test-project/tenant:latest",
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    } as any,
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  let provider: CloudRunProvider;
  let mockRunClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new CloudRunProvider(config);
    mockRunClient = (provider as any).runClient;
  });

  describe("deployTenantInstance", () => {
    it("should create a new service if it does not exist", async () => {
      // Mock service not found
      mockRunClient.projects.locations.services.get.mockRejectedValueOnce({
        code: 404,
      });

      // Mock create response
      mockRunClient.projects.locations.services.create.mockResolvedValueOnce({
        data: {
          name: "projects/test-project/locations/us-central1/operations/op-1",
        },
      });

      // Mock operation completion
      mockRunClient.projects.locations.operations.get.mockResolvedValueOnce({
        data: { done: true },
      });

      // Mock IAM policy
      mockRunClient.projects.locations.services.getIamPolicy.mockResolvedValueOnce(
        {
          data: { bindings: [] },
        },
      );
      mockRunClient.projects.locations.services.setIamPolicy.mockResolvedValueOnce(
        {},
      );

      // Mock final service get to retrieve URI
      mockRunClient.projects.locations.services.get.mockResolvedValueOnce({
        data: { uri: "https://tenant-1.a.run.app" },
      });

      const uri = await provider.deployTenantInstance("1", {
        DATABASE_URL: "postgres://...",
      });

      expect(uri).toBe("https://tenant-1.a.run.app");
      expect(
        mockRunClient.projects.locations.services.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: "tenant-1",
        }),
      );
    });

    it("should patch existing service if it exists", async () => {
      // Mock service exists
      mockRunClient.projects.locations.services.get.mockResolvedValueOnce({
        data: { name: "existing-service" },
      });

      // Mock patch response
      mockRunClient.projects.locations.services.patch.mockResolvedValueOnce({
        data: {
          name: "projects/test-project/locations/us-central1/operations/op-2",
        },
      });

      // Mock operation completion
      mockRunClient.projects.locations.operations.get.mockResolvedValueOnce({
        data: { done: true },
      });

      // Mock IAM policy
      mockRunClient.projects.locations.services.getIamPolicy.mockResolvedValueOnce(
        {
          data: {
            bindings: [{ role: "roles/run.invoker", members: ["allUsers"] }],
          },
        },
      );

      // Mock final service get to retrieve URI
      mockRunClient.projects.locations.services.get.mockResolvedValueOnce({
        data: { uri: "https://tenant-1-updated.a.run.app" },
      });

      const uri = await provider.deployTenantInstance("tenant-1", {
        DATABASE_URL: "postgres://...",
      });

      expect(uri).toBe("https://tenant-1-updated.a.run.app");
      expect(
        mockRunClient.projects.locations.services.patch,
      ).toHaveBeenCalled();
    });

    it("should throw error if deployment operation fails", async () => {
      mockRunClient.projects.locations.services.get.mockRejectedValueOnce({
        code: 404,
      });
      mockRunClient.projects.locations.services.create.mockResolvedValueOnce({
        data: { name: "op-fail" },
      });

      // Mock operation failure
      mockRunClient.projects.locations.operations.get.mockResolvedValueOnce({
        data: { done: true, error: { message: "Internal error" } },
      });

      await expect(
        provider.deployTenantInstance("tenant-1", {}),
      ).rejects.toThrow("Internal error");
    });
  });

  describe("waitForOperation", () => {
    it("should timeout if operation takes too long", async () => {
      vi.useFakeTimers();

      // Mock operation never done
      mockRunClient.projects.locations.operations.get.mockResolvedValue({
        data: { done: false },
      });

      const deployPromise = (provider as any).waitForOperation("test-op");
      // Prevent unhandled rejection warning by attaching a dummy catch
      deployPromise.catch(() => {});

      // Advance timers in increments to allow the async loop to catch up
      for (let index = 0; index < 151; index++) {
        await vi.advanceTimersByTimeAsync(2000);
      }

      await expect(deployPromise).rejects.toThrow(
        "Timeout waiting for Cloud Run operation",
      );

      vi.useRealTimers();
    });
  });

  describe("makeServicePublic", () => {
    it("should add public binding if not present", async () => {
      mockRunClient.projects.locations.services.getIamPolicy.mockResolvedValue({
        data: { bindings: [] },
      });
      mockRunClient.projects.locations.services.setIamPolicy.mockResolvedValue(
        {},
      );

      await (provider as any).makeServicePublic("test-service");

      expect(
        mockRunClient.projects.locations.services.setIamPolicy,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            policy: {
              bindings: [
                {
                  role: "roles/run.invoker",
                  members: ["allUsers"],
                },
              ],
            },
          },
        }),
      );
    });

    it("should update existing invoker binding to include allUsers", async () => {
      mockRunClient.projects.locations.services.getIamPolicy.mockResolvedValue({
        data: {
          bindings: [
            {
              role: "roles/run.invoker",
              members: ["user:special@example.com"],
            },
          ],
        },
      });
      mockRunClient.projects.locations.services.setIamPolicy.mockResolvedValue(
        {},
      );

      await (provider as any).makeServicePublic("test-service");

      const call =
        mockRunClient.projects.locations.services.setIamPolicy.mock.calls[0][0];
      const invokerBinding = call.requestBody.policy.bindings.find(
        (b: any) => b.role === "roles/run.invoker",
      );
      expect(invokerBinding.members).toContain("allUsers");
      expect(invokerBinding.members).toContain("user:special@example.com");
    });
  });
});
