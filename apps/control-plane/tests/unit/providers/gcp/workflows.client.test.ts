import { createLogger } from "@vendin/logger";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { GcpWorkflowsClient } from "../../../../src/providers/gcp/workflows.client";
import { GoogleAuth } from "../../../../src/utils/google-auth";

// Mock dependencies
vi.mock("../../../../src/utils/google-auth");

describe("GcpWorkflowsClient", () => {
  let client: GcpWorkflowsClient;
  const mockLogger = createLogger({ logLevel: "silent", nodeEnv: "test" });
  const config = {
    projectId: "test-project",
    location: "us-central1",
    credentialsJson: "{}",
    logger: mockLogger,
  };

  const mockGetAccessToken = vi.fn();
  // Mocking global fetch
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup GoogleAuth mock
    vi.mocked(GoogleAuth).mockImplementation(
      () =>
        ({
          getAccessToken: mockGetAccessToken,
        }) as unknown as GoogleAuth,
    );

    mockGetAccessToken.mockResolvedValue("mock-token");

    // Mock global fetch
    globalThis.fetch = vi.fn();

    // Spy on logger
    vi.spyOn(mockLogger, "error");

    client = new GcpWorkflowsClient(config);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("createExecution", () => {
    it("should log detailed error information when execution creation fails", async () => {
      const error = new Error("Network error");
      // Mock fetch to reject
      (
        globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      ).mockRejectedValue(error);

      const options = {
        parent:
          "projects/test-project/locations/us-central1/workflows/test-workflow",
        execution: {
          argument: "{}",
        },
      };

      await expect(client.createExecution(options)).rejects.toThrow(
        "Network error",
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error,
          parent: options.parent,
          errorMessage: "Network error",
          errorStack: expect.stringContaining("Error: Network error"),
        }),
        "Failed to create workflow execution",
      );
    });
  });
});
