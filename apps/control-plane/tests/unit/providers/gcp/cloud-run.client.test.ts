import { createLogger } from "@vendin/utils/logger";
import { GoogleAuth } from "google-auth-library";
import { run_v2 } from "googleapis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CloudRunProvider } from "../../../../src/providers/gcp/cloud-run.client";

// Mock dependencies
vi.mock("google-auth-library");
vi.mock("googleapis", () => {
  return {
    run_v2: {
      Run: vi.fn(),
    },
  };
});

describe("CloudRunProvider", () => {
  let provider: CloudRunProvider;
  const mockLogger = createLogger({ logLevel: "silent" });
  const mockRunClient = {
    projects: {
      locations: {
        operations: {
          get: vi.fn(),
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the GoogleAuth constructor
    const GoogleAuthMock = vi.mocked(GoogleAuth);
    GoogleAuthMock.mockImplementation(
      () =>
        ({
          getClient: vi.fn(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
    );

    // Mock the Run client constructor
    const RunMock = vi.mocked(run_v2.Run);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    RunMock.mockImplementation(() => mockRunClient as any);

    provider = new CloudRunProvider({
      projectId: "test-project",
      region: "test-region",
      tenantImageTag: "test-tag",
      logger: mockLogger,
      credentialsJson: "{}",
    });
  });

  describe("getOperation", () => {
    it("should log and re-throw error if API call fails", async () => {
      const error = new Error("API Failure");
      mockRunClient.projects.locations.operations.get.mockRejectedValue(error);
      const loggerSpy = vi.spyOn(mockLogger, "error");

      await expect(provider.getOperation("op-123")).rejects.toThrow(
        "API Failure",
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        { err: error, name: "op-123" },
        "Failed to get operation",
      );
    });
  });
});
