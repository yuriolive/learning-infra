import Cloudflare from "cloudflare";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CloudflareProvider } from "./cloudflare.client";

// Mock the Cloudflare SDK
vi.mock("cloudflare", () => {
  const CloudflareMock = vi.fn();
  CloudflareMock.prototype.customHostnames = {
    create: vi.fn(),
    list: vi.fn(),
  };
  return {
    default: CloudflareMock,
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

describe("CloudflareProvider", () => {
  const originalEnvironment = process.env;

  let provider: CloudflareProvider;
  let mockCustomHostnames: {
    create: MockedFunction;
    list: MockedFunction;
  };
  type MockedFunction = ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnvironment };
    process.env.CLOUDFLARE_API_TOKEN = "test-token";
    process.env.CLOUDFLARE_ZONE_ID = "test-zone-id";

    // Initialize provider and extract mock
    provider = new CloudflareProvider();
    const client = (provider as unknown as { client: Cloudflare }).client;
    mockCustomHostnames = client.customHostnames as unknown as {
      create: MockedFunction;
      list: MockedFunction;
    };
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it("should throw error if CLOUDFLARE_API_TOKEN is missing", () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    expect(() => new CloudflareProvider()).toThrow(
      "CLOUDFLARE_API_TOKEN environment variable is not set",
    );
  });

  it("should throw error if CLOUDFLARE_ZONE_ID is missing", () => {
    delete process.env.CLOUDFLARE_ZONE_ID;
    expect(() => new CloudflareProvider()).toThrow(
      "CLOUDFLARE_ZONE_ID environment variable is not set",
    );
  });

  it("should initialize with correct credentials", () => {
    // Re-init to trigger constructor
    new CloudflareProvider();
    expect(Cloudflare).toHaveBeenCalledWith({ apiToken: "test-token" });
  });

  describe("createCustomHostname", () => {
    it("should create a custom hostname successfully with defaults", async () => {
      mockCustomHostnames.create.mockResolvedValue({});

      await provider.createCustomHostname("tenant-1", "test.example.com");

      expect(mockCustomHostnames.create).toHaveBeenCalledWith({
        hostname: "test.example.com",
        ssl: {
          method: "http",
          type: "dv",
        },
        zone_id: "test-zone-id",
      });
    });

    it("should allow overriding SSL settings", async () => {
      mockCustomHostnames.create.mockResolvedValue({});

      await provider.createCustomHostname("tenant-1", "test.example.com", {
        ssl: { method: "txt", type: "dv" },
      });

      expect(mockCustomHostnames.create).toHaveBeenCalledWith({
        hostname: "test.example.com",
        ssl: {
          method: "txt",
          type: "dv",
        },
        zone_id: "test-zone-id",
      });
    });

    it("should propagate errors from SDK", async () => {
      const error = new Error("API Error");
      mockCustomHostnames.create.mockRejectedValue(error);

      await expect(
        provider.createCustomHostname("tenant-1", "test.example.com"),
      ).rejects.toThrow("API Error");
    });
  });

  describe("getHostnameStatus", () => {
    it("should return status and verification errors", async () => {
      const mockResponse = {
        result: [
          {
            hostname: "test.example.com",
            status: "active",
            verification_errors: ["error1"],
          },
        ],
      };

      mockCustomHostnames.list.mockResolvedValue(mockResponse);

      const result = await provider.getHostnameStatus(
        "tenant-1",
        "test.example.com",
      );

      expect(result).toEqual({
        status: "active",
        verification_errors: ["error1"],
      });
      expect(mockCustomHostnames.list).toHaveBeenCalledWith({
        hostname: "test.example.com",
        zone_id: "test-zone-id",
      });
    });

    it("should throw error if hostname not found", async () => {
      const mockResponse = {
        result: [],
      };

      mockCustomHostnames.list.mockResolvedValue(mockResponse);

      await expect(
        provider.getHostnameStatus("tenant-1", "test.example.com"),
      ).rejects.toThrow("Hostname test.example.com not found in Cloudflare");
    });
  });
});
