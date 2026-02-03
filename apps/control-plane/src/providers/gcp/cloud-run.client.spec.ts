import { GoogleAuth } from "google-auth-library";
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
              delete: vi.fn(),
              getIamPolicy: mockGetIamPolicy,
              setIamPolicy: mockSetIamPolicy,
            },
            jobs: {
              get: vi.fn(),
              patch: vi.fn(),
              create: vi.fn(),
              delete: vi.fn(), // Added delete
              run: vi.fn(),
              executions: {
                get: vi.fn(),
              },
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

type MockedFunction = ReturnType<typeof vi.fn>;

interface MockRunClient {
  projects: {
    locations: {
      services: {
        get: MockedFunction;
        create: MockedFunction;
        patch: MockedFunction;
        delete: MockedFunction;
        getIamPolicy: MockedFunction;
        setIamPolicy: MockedFunction;
      };
      jobs: {
        get: MockedFunction;
        patch: MockedFunction;
        create: MockedFunction;
        delete: MockedFunction; // Added delete
        run: MockedFunction;
        executions: {
          get: MockedFunction;
        };
      };
      operations: {
        get: MockedFunction;
      };
    };
  };
}

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
    },
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  let provider: CloudRunProvider;
  let mockRunClient: MockRunClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createProvider = (
    c: Partial<ConstructorParameters<typeof CloudRunProvider>[0]>,
  ) => {
    return new CloudRunProvider({
      ...config,
      ...c,
    } as ConstructorParameters<typeof CloudRunProvider>[0]);
  };

  describe("constructor", () => {
    it("should use credentialsJson as object if it is valid JSON", () => {
      provider = createProvider({
        credentialsJson: JSON.stringify({ project_id: "test" }),
      });
      expect(GoogleAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: { project_id: "test" },
        }),
      );
    });

    it("should use credentialsJson as keyFilename if it is not valid JSON", () => {
      provider = createProvider({
        credentialsJson: "/path/to/key.json",
      });
      expect(GoogleAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          keyFilename: "/path/to/key.json",
        }),
      );
    });

    it("should not pass credentials if credentialsJson is undefined", () => {
      provider = createProvider({
        credentialsJson: undefined,
      });
      expect(GoogleAuth).toHaveBeenCalledWith(
        expect.not.objectContaining({
          credentials: expect.anything(),
          keyFilename: expect.anything(),
        }),
      );
    });
  });

  beforeEach(() => {
    provider = new CloudRunProvider(
      config as unknown as ConstructorParameters<typeof CloudRunProvider>[0],
    );
    mockRunClient = (provider as unknown as { runClient: unknown })
      .runClient as MockRunClient;
    // Default mocks are set in beforeEach, tests can override with *Once methods
    mockRunClient.projects.locations.services.get.mockResolvedValue({
      data: { uri: "https://tenant-1.a.run.app" },
    });
    mockRunClient.projects.locations.services.create.mockResolvedValue({
      data: {
        name: "projects/test-project/locations/us-central1/operations/op-1",
      },
    });
    mockRunClient.projects.locations.operations.get.mockResolvedValue({
      data: { done: true },
    });
    mockRunClient.projects.locations.services.getIamPolicy.mockResolvedValue({
      data: { bindings: [] },
    });
    mockRunClient.projects.locations.services.setIamPolicy.mockResolvedValue(
      {},
    );
    mockRunClient.projects.locations.services.patch.mockResolvedValue({
      data: {
        name: "projects/test-project/locations/us-central1/operations/op-2",
      },
    });
  });

  const setupIamPolicyMock = (bindings: unknown[] = []) => {
    mockRunClient.projects.locations.services.getIamPolicy.mockResolvedValue({
      data: { bindings },
    });
    mockRunClient.projects.locations.services.setIamPolicy.mockResolvedValue(
      {},
    );
  };

  describe("startDeployTenantInstance", () => {
    it("should create a new service if it does not exist", async () => {
      mockRunClient.projects.locations.services.get.mockRejectedValueOnce({
        code: 404,
      });

      const opName = await provider.startDeployTenantInstance("1", {
        databaseUrl: "postgres://...",
        redisUrl: "redis://...",
        redisPrefix: "t_1:",
        subdomain: "tenant-1",
      });

      expect(opName).toBe(
        "projects/test-project/locations/us-central1/operations/op-1",
      );
      expect(
        mockRunClient.projects.locations.services.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: "tenant-1",
        }),
      );
    });

    it("should patch existing service if it exists", async () => {
      mockRunClient.projects.locations.services.get.mockResolvedValueOnce({
        data: { name: "existing-service" },
      });

      const opName = await provider.startDeployTenantInstance("tenant-1", {
        databaseUrl: "postgres://...",
        redisUrl: "redis://...",
        redisPrefix: "t_1:",
        subdomain: "tenant-1",
      });

      expect(opName).toBe(
        "projects/test-project/locations/us-central1/operations/op-2",
      );
      expect(
        mockRunClient.projects.locations.services.patch,
      ).toHaveBeenCalled();
    });
  });

  describe("finalizeTenantService", () => {
    it("should make service public and return URI", async () => {
      mockRunClient.projects.locations.services.get.mockResolvedValueOnce({
        data: { uri: "https://final-uri.a.run.app" },
      });
      setupIamPolicyMock([]);

      const uri = await provider.finalizeTenantService("tenant-1");

      expect(uri).toBe("https://final-uri.a.run.app");
      expect(
        mockRunClient.projects.locations.services.setIamPolicy,
      ).toHaveBeenCalled();
    });
  });

  describe("ensureMigrationJob", () => {
    it("should create/patch job and return operation name", async () => {
      mockRunClient.projects.locations.jobs.get.mockRejectedValueOnce({
        code: 404,
      });
      mockRunClient.projects.locations.jobs.create.mockResolvedValueOnce({
        data: { name: "job-op-1" },
      });

      const opName = await provider.ensureMigrationJob("tenant-1", {
        databaseUrl: "postgres://",
        redisUrl: "redis://",
        redisPrefix: "t_1:",
      });

      expect(opName).toBe("job-op-1");
      expect(mockRunClient.projects.locations.jobs.create).toHaveBeenCalled();
    });
  });

  describe("triggerMigrationJob", () => {
    it("should run job and return execution name", async () => {
      mockRunClient.projects.locations.jobs.run.mockResolvedValueOnce({
        data: { name: "exec-op-1" },
      });

      const execName = await provider.triggerMigrationJob("tenant-1");

      expect(execName).toBe("exec-op-1");
      expect(mockRunClient.projects.locations.jobs.run).toHaveBeenCalled();
    });
  });

  describe("getOperation", () => {
    it("should return done status", async () => {
      mockRunClient.projects.locations.operations.get.mockResolvedValueOnce({
        data: { done: true, response: { foo: "bar" } },
      });

      const status = await provider.getOperation("op-1");
      expect(status).toEqual({ done: true, response: { foo: "bar" } });
    });

    it("should return error if operation failed", async () => {
      mockRunClient.projects.locations.operations.get.mockResolvedValueOnce({
        data: { done: true, error: { message: "Failed" } },
      });

      const status = await provider.getOperation("op-1");
      expect(status).toEqual({ done: true, error: "Failed" });
    });
  });

  describe("makeServicePublic", () => {
    it("should add public binding if not present", async () => {
      setupIamPolicyMock([]);

      await (
        provider as unknown as {
          makeServicePublic: (id: string) => Promise<void>;
        }
      ).makeServicePublic("test-service");

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
      setupIamPolicyMock([
        {
          role: "roles/run.invoker",
          members: ["user:special@example.com"],
        },
      ]);

      await (
        provider as unknown as {
          makeServicePublic: (id: string) => Promise<void>;
        }
      ).makeServicePublic("test-service");

      const calls =
        mockRunClient.projects.locations.services.setIamPolicy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const call = calls[0]?.[0];
      if (!call) {
        throw new Error("Expected setIamPolicy to have been called");
      }
      const invokerBinding = call.requestBody.policy.bindings.find(
        (b: { role: string; members: string[] }) =>
          b.role === "roles/run.invoker",
      );
      expect(invokerBinding.members).toContain("allUsers");
      expect(invokerBinding.members).toContain("user:special@example.com");
    });
  });

  describe("deleteTenantInstance", () => {
    it("should delete service and return operation name", async () => {
      mockRunClient.projects.locations.services.delete.mockResolvedValueOnce({
        data: { name: "delete-op-1" },
      });

      const opName = await provider.deleteTenantInstance("tenant-1");

      expect(opName).toBe("delete-op-1");
      expect(
        mockRunClient.projects.locations.services.delete,
      ).toHaveBeenCalled();
    });

    it("should return undefined if service not found (404)", async () => {
      mockRunClient.projects.locations.services.delete.mockRejectedValueOnce({
        code: 404,
      });

      const opName = await provider.deleteTenantInstance("tenant-1");

      expect(opName).toBeUndefined();
    });

    it("should return undefined and log warning on other errors", async () => {
      mockRunClient.projects.locations.services.delete.mockRejectedValueOnce(
        new Error("Unknown error"),
      );

      const opName = await provider.deleteTenantInstance("tenant-1");

      expect(opName).toBeUndefined();
      expect(config.logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        "Failed to delete Cloud Run service",
      );
    });
  });
  describe("deleteMigrationJob", () => {
    it("should delete job and log success", async () => {
      mockRunClient.projects.locations.jobs.delete.mockResolvedValueOnce({
        data: { name: "delete-op-job-1" },
      });

      await provider.deleteMigrationJob("tenant-1");

      expect(mockRunClient.projects.locations.jobs.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "projects/test-project/locations/us-central1/jobs/migration-tenant-1",
        }),
      );
      expect(config.logger.info).toHaveBeenCalledWith(
        { tenantId: "tenant-1" },
        "Deleted migration job",
      );
    });

    it("should return undefined and match 404 behavior (idempotent) if job not found", async () => {
      mockRunClient.projects.locations.jobs.delete.mockRejectedValueOnce({
        code: 404,
      });

      await provider.deleteMigrationJob("tenant-1");

      expect(config.logger.info).toHaveBeenCalledWith(
        { tenantId: "tenant-1" },
        "Migration job already deleted or not found",
      );
    });

    it("should throw error if API call fails with non-404 error", async () => {
      const error = new Error("API Failure");
      mockRunClient.projects.locations.jobs.delete.mockRejectedValueOnce(error);

      await expect(provider.deleteMigrationJob("tenant-1")).rejects.toThrow(
        "API Failure",
      );

      expect(config.logger.error).toHaveBeenCalledWith(
        { error, tenantId: "tenant-1" },
        "Failed to delete migration job",
      );
    });
  });
});
