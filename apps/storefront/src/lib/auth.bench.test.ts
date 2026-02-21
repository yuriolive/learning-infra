import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTenantAuthToken } from "./auth";

// Mock @vendin/logger
vi.mock("@vendin/logger", () => ({
  createCloudflareLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock @vendin/utils
vi.mock("@vendin/utils", () => ({
  resolveGoogleCredentials: vi.fn(),
}));

// Mock Google Auth Library
const mockGetRequestHeaders = vi.fn();
const mockGetIdTokenClient = vi.fn();

vi.mock("google-auth-library", () => {
  return {
    GoogleAuth: vi.fn().mockImplementation(function() {
      return {
        getIdTokenClient: mockGetIdTokenClient,
      };
    }),
  };
});

describe("getTenantAuthToken Performance Benchmark", () => {
  const dummyCredentials = JSON.stringify({
    type: "service_account",
    project_id: "test-project",
    private_key_id: "123",
    private_key: "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n",
    client_email: "test@example.com",
    client_id: "123",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const utils = await import("@vendin/utils");

    // Simulate real-world latency for credential resolution (e.g., reading from env, decoding, or fetching from metadata service)
    // 5ms is a conservative estimate for simple env read + JSON.parse of a large key,
    // but metadata service calls can be 10-50ms.
    vi.mocked(utils.resolveGoogleCredentials).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return dummyCredentials;
    });

    // Mock client behavior
    mockGetIdTokenClient.mockResolvedValue({
      getRequestHeaders: mockGetRequestHeaders,
    });

    // Simulate token generation/refresh latency (e.g. 1ms for cached token, higher for fresh)
    mockGetRequestHeaders.mockImplementation(async () => {
      // Fast path (cached token in client)
      return new Map([["Authorization", "Bearer mock-token"]]);
    });
  });

  it("Benchmark: 100 calls to getTenantAuthToken", async () => {
    const targetUrl = "https://backend.example.com";
    const iterations = 100;

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await getTenantAuthToken(targetUrl);
    }

    const end = performance.now();
    const duration = end - start;

    const { GoogleAuth } = await import("google-auth-library");
    const instantiationCount = vi.mocked(GoogleAuth).mock.calls.length;
    const { resolveGoogleCredentials } = await import("@vendin/utils");
    const resolutionCount = vi.mocked(resolveGoogleCredentials).mock.calls.length;

    console.log(`
    --------------------------------------------------
    Benchmark Results (Optimized):
    Total Time for ${iterations} calls: ${duration.toFixed(2)}ms
    Average Time per call: ${(duration / iterations).toFixed(2)}ms
    GoogleAuth Instantiations: ${instantiationCount}
    Credential Resolutions: ${resolutionCount}
    --------------------------------------------------
    `);

    // Correctness check
    expect(instantiationCount).toBe(1);
    expect(resolutionCount).toBe(1);
  });
});
