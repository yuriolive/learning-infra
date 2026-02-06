import Cloudflare from "cloudflare";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type Logger } from "../../utils/logger";

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

const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
};

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

    // Initialize provider and extract mock
    provider = new CloudflareProvider({
      apiToken: "test-token",
      zoneId: "test-zone-id",
      logger: mockLogger as unknown as Logger,
    });
    const client = (provider as unknown as { client: Cloudflare }).client;
    mockCustomHostnames = client.customHostnames as unknown as {
      create: MockedFunction;
      list: MockedFunction;
    };
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it("should initialize with correct credentials", () => {
    // Re-init to trigger constructor
    new CloudflareProvider({
      apiToken: "test-token",
      zoneId: "test-zone-id",
      logger: mockLogger as unknown as Logger,
    });
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
