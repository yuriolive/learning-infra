import { describe, it, expect, vi, beforeEach } from "vitest";

import { GoogleAuth } from "../../utils/google-auth";

import { GcpWorkflowsClient } from "./workflows.client";

import type { Logger } from "../../utils/logger";

// Mock GoogleAuth class
vi.mock("../../utils/google-auth", () => {
  return {
    GoogleAuth: vi.fn().mockImplementation(() => ({
      getAccessToken: vi.fn().mockResolvedValue("mock-access-token"),
    })),
  };
});

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe("GcpWorkflowsClient", () => {
  let client: GcpWorkflowsClient;
  const config = {
    credentialsJson: JSON.stringify({ project_id: "test" }),
    projectId: "test-project",
    location: "test-region",
    logger: mockLogger as unknown as Logger,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ name: "execution-123" }),
    });

    client = new GcpWorkflowsClient(config);
  });

  describe("constructor", () => {
    it("should initialize GoogleAuth if credentials provided", () => {
      expect(GoogleAuth).toHaveBeenCalledWith(config.credentialsJson);
    });

    it("should log error if GoogleAuth initialization fails", () => {
      const error = new Error("Auth Init Failed");
      (GoogleAuth as unknown as { mockImplementationOnce: (fn: () => void) => void }).mockImplementationOnce(() => {
        throw error;
      });

      new GcpWorkflowsClient(config);
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error },
        "Failed to initialize Google Auth for Workflows",
      );
    });
  });

  describe("triggerProvisionTenant", () => {
    it("should call createExecution with correct payload", async () => {
      const payload = { tenantId: "t1", baseUrl: "url" };
      const createExecutionSpy = vi.spyOn(client, "createExecution");

      await client.triggerProvisionTenant(payload);

      expect(createExecutionSpy).toHaveBeenCalledWith({
        parent:
          "projects/test-project/locations/test-region/workflows/provision-tenant",
        execution: {
          argument: JSON.stringify(payload),
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.anything(),
        "Triggering provisioning workflow",
      );
    });
  });

  describe("createExecution", () => {
    it("should throw if auth not initialized (no credentials)", async () => {
      const clientNoAuth = new GcpWorkflowsClient({
        ...config,
        credentialsJson: undefined,
      });

      await expect(
        clientNoAuth.createExecution({
          parent: "p",
          execution: { argument: "{}" },
        }),
      ).rejects.toThrow("GCP Credentials not configured");
    });

    it("should call fetch with correct headers and body", async () => {
      await client.createExecution({
        parent: "projects/p/locations/l/workflows/w",
        execution: { argument: "{}" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://workflowexecutions.googleapis.com/v1/projects/p/locations/l/workflows/w/executions",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer mock-access-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ argument: "{}" }),
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.anything(),
        "Workflow execution created successfully",
      );
    });

    it("should throw error if fetch response is not ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Workflow specific error",
      });

      await expect(
        client.createExecution({
          parent: "p",
          execution: { argument: "{}" },
        }),
      ).rejects.toThrow(
        "Workflow execution failed: 500 Internal Server Error - Workflow specific error",
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: expect.stringContaining("Workflow execution failed"),
        }),
        "Failed to create workflow execution",
      );
    });

    it("should handle auth token retrieval failure", async () => {
      const error = new Error("Token Error");
      // Access the mock instance
      // The mock accumulates results from calls.
      // Since beforeEach recreates client, we need the *last* instance created.
      const calls = (GoogleAuth as unknown as { mock: { results: Array<{ value: { getAccessToken: { mockRejectedValueOnce: (err: Error) => void } } }> } }).mock.results;
      const lastInstance = calls.at(-1)?.value;

      lastInstance?.getAccessToken.mockRejectedValueOnce(error);

      await expect(
        client.createExecution({
          parent: "p",
          execution: { argument: "{}" },
        }),
      ).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.anything(),
        "Failed to create workflow execution",
      );
    });
  });
});
