import Cloudflare from "cloudflare";
import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

import { type Logger } from "../../utils/logger";
import { CloudflareProvider } from "./cloudflare.client";

// Mock the Cloudflare SDK
// We need to mock the constructor to return an object with the structure we expect.
vi.mock("cloudflare", () => {
  const CloudflareMock = vi.fn();
  CloudflareMock.prototype.customHostnames = {
    create: vi.fn(),
    list: vi.fn(),
  };
  CloudflareMock.prototype.dns = {
    records: {
      create: vi.fn(),
    },
  };
  return {
    default: CloudflareMock,
  };
});

const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe("CloudflareProvider", () => {
  let provider: CloudflareProvider;
  let mockCustomHostnames: {
    create: MockedFunction<any>;
    list: MockedFunction<any>;
  };
  let mockDnsRecords: {
    create: MockedFunction<any>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    provider = new CloudflareProvider({
      apiToken: "test-token",
      zoneId: "test-zone-id",
      logger: mockLogger as unknown as Logger,
    });

    // Access the mocked instance
    const client = (provider as any).client;
    mockCustomHostnames = client.customHostnames;
    mockDnsRecords = client.dns.records;
  });

  describe("constructor", () => {
    it("should initialize with correct credentials", () => {
        expect(Cloudflare).toHaveBeenCalledWith({ apiToken: "test-token" });
    });
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
      expect(mockLogger.info).toHaveBeenCalledWith(expect.anything(), "Successfully created Cloudflare custom hostname");
    });

    it("should allow overriding SSL settings", async () => {
      mockCustomHostnames.create.mockResolvedValue({});

      await provider.createCustomHostname("tenant-1", "test.example.com", {
        ssl: { method: "txt", type: "dv" },
      });

      expect(mockCustomHostnames.create).toHaveBeenCalledWith(expect.objectContaining({
        ssl: { method: "txt", type: "dv" },
      }));
    });

    it("should propagate errors from SDK", async () => {
      const error = new Error("API Error");
      mockCustomHostnames.create.mockRejectedValue(error);

      await expect(
        provider.createCustomHostname("tenant-1", "test.example.com"),
      ).rejects.toThrow("API Error");
      expect(mockLogger.error).toHaveBeenCalled();
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
        result: [], // Empty
      };

      mockCustomHostnames.list.mockResolvedValue(mockResponse);

      await expect(
        provider.getHostnameStatus("tenant-1", "test.example.com"),
      ).rejects.toThrow("Hostname test.example.com not found in Cloudflare");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should return status unknown if missing in response", async () => {
      const mockResponse = {
          result: [{ hostname: "test.example.com" }] // No status
      };
      mockCustomHostnames.list.mockResolvedValue(mockResponse);

      const result = await provider.getHostnameStatus("tenant-1", "test.example.com");
      expect(result.status).toBe("unknown");
    });
  });

  describe("createDnsRecord", () => {
    it("should create DNS record successfully", async () => {
      mockDnsRecords.create.mockResolvedValue({ success: true });

      const record = {
        type: "CNAME" as const,
        name: "test",
        content: "target",
        proxied: true,
      };

      await provider.createDnsRecord(record);

      expect(mockDnsRecords.create).toHaveBeenCalledWith({
        zone_id: "test-zone-id",
        ...record,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(expect.anything(), "Successfully created Cloudflare DNS record");
    });

    it("should handle DNS creation failure", async () => {
      const error = new Error("DNS Error");
      mockDnsRecords.create.mockRejectedValue(error);

      await expect(provider.createDnsRecord({
        type: "A",
        name: "test",
        content: "1.2.3.4",
      })).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.anything(), "Failed to create Cloudflare DNS record");
    });
  });
});
