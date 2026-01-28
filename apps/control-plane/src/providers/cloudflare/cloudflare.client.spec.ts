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

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnvironment };
    process.env.CLOUDFLARE_API_TOKEN = "test-token";
    process.env.CLOUDFLARE_ZONE_ID = "test-zone-id";
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
    new CloudflareProvider();
    expect(Cloudflare).toHaveBeenCalledWith({ apiToken: "test-token" });
  });

  describe("createCustomHostname", () => {
    it("should create a custom hostname successfully with defaults", async () => {
      const provider = new CloudflareProvider();
      // Access private client via casting for testing
      const mockCreate = (provider as unknown as { client: Cloudflare }).client
        .customHostnames.create as unknown;
      mockCreate.mockResolvedValue({});

      await provider.createCustomHostname("tenant-1", "test.example.com");

      expect(mockCreate).toHaveBeenCalledWith({
        hostname: "test.example.com",
        ssl: {
          method: "http",
          type: "dv",
        },
        zone_id: "test-zone-id",
      });
    });

    it("should allow overriding SSL settings", async () => {
      const provider = new CloudflareProvider();
      const mockCreate = (provider as any).client.customHostnames.create;
      mockCreate.mockResolvedValue({} as any);

      await provider.createCustomHostname("tenant-1", "test.example.com", {
        ssl: { method: "txt", type: "dv" },
      });

      expect(mockCreate).toHaveBeenCalledWith({
        hostname: "test.example.com",
        ssl: {
          method: "txt",
          type: "dv",
        },
        zone_id: "test-zone-id",
      });
    });

    it("should propagate errors from SDK", async () => {
      const provider = new CloudflareProvider();
      const mockCreate = (provider as any).client.customHostnames.create;
      const error = new Error("API Error");
      mockCreate.mockRejectedValue(error);

      await expect(
        provider.createCustomHostname("tenant-1", "test.example.com"),
      ).rejects.toThrow("API Error");
    });
  });

  describe("getHostnameStatus", () => {
    it("should return status and verification errors", async () => {
      const provider = new CloudflareProvider();
      const mockList = (provider as unknown as { client: Cloudflare }).client
        .customHostnames.list as any;

      const mockResponse = {
        result: [
          {
            hostname: "test.example.com",
            status: "active",
            verification_errors: ["error1"],
          },
        ],
      };

      mockList.mockResolvedValue(mockResponse);

      const result = await provider.getHostnameStatus(
        "tenant-1",
        "test.example.com",
      );

      expect(result).toEqual({
        status: "active",
        verification_errors: ["error1"],
      });
      expect(mockList).toHaveBeenCalledWith({
        hostname: "test.example.com",
        zone_id: "test-zone-id",
      });
    });

    it("should throw error if hostname not found", async () => {
      const provider = new CloudflareProvider();
      const mockList = (provider as any).client.customHostnames.list;

      const mockResponse = {
        result: [],
      };

      mockList.mockResolvedValue(mockResponse as any);

      await expect(
        provider.getHostnameStatus("tenant-1", "test.example.com"),
      ).rejects.toThrow("Hostname test.example.com not found in Cloudflare");
    });
  });
});
