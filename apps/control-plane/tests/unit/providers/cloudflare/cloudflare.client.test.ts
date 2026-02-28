import { createLogger } from "@vendin/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CloudflareProvider } from "../../../../src/providers/cloudflare/cloudflare.client";

vi.mock("cloudflare");

import Cloudflare from "cloudflare";

const logger = createLogger({ logLevel: "silent" });

describe("CloudflareProvider", () => {
  let mockSdk: {
    customHostnames: {
      create: ReturnType<typeof vi.fn>;
      list: ReturnType<typeof vi.fn>;
    };
    dns: { records: { create: ReturnType<typeof vi.fn> } };
  };
  let provider: CloudflareProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSdk = {
      customHostnames: {
        create: vi.fn(),
        list: vi.fn(),
      },
      dns: {
        records: {
          create: vi.fn(),
        },
      },
    };

    vi.mocked(Cloudflare).mockImplementation(
      () => mockSdk as unknown as Cloudflare,
    );

    provider = new CloudflareProvider({
      apiToken: "test-token",
      zoneId: "zone-1",
      logger,
    });
  });

  // ---------------------------------------------------------------------------
  describe("createCustomHostname", () => {
    it("should create a custom hostname with default ssl options", async () => {
      mockSdk.customHostnames.create.mockResolvedValue({ id: "ch-1" });

      const result = await provider.createCustomHostname(
        "tenant-1",
        "shop.acme.com",
      );

      expect(result).toEqual({ id: "ch-1" });
      expect(mockSdk.customHostnames.create).toHaveBeenCalledWith({
        zone_id: "zone-1",
        hostname: "shop.acme.com",
        ssl: { method: "http", type: "dv" },
      });
    });

    it("should forward custom ssl options", async () => {
      mockSdk.customHostnames.create.mockResolvedValue({});

      await provider.createCustomHostname("tenant-1", "shop.acme.com", {
        ssl: { method: "txt", type: "dv" },
      });

      expect(mockSdk.customHostnames.create).toHaveBeenCalledWith(
        expect.objectContaining({ ssl: { method: "txt", type: "dv" } }),
      );
    });

    it("should rethrow on error", async () => {
      mockSdk.customHostnames.create.mockRejectedValue(new Error("api error"));

      await expect(
        provider.createCustomHostname("tenant-1", "shop.acme.com"),
      ).rejects.toThrow("api error");
    });
  });

  // ---------------------------------------------------------------------------
  describe("getHostnameStatus", () => {
    it("should return status for a known hostname", async () => {
      mockSdk.customHostnames.list.mockResolvedValue({
        result: [
          { hostname: "other.com", status: "active" },
          {
            hostname: "shop.acme.com",
            status: "pending",
            verification_errors: ["dns not found"],
          },
        ],
      });

      const result = await provider.getHostnameStatus(
        "tenant-1",
        "shop.acme.com",
      );

      expect(result).toEqual({
        status: "pending",
        verification_errors: ["dns not found"],
      });
    });

    it("should throw if hostname not found", async () => {
      mockSdk.customHostnames.list.mockResolvedValue({ result: [] });

      await expect(
        provider.getHostnameStatus("tenant-1", "missing.com"),
      ).rejects.toThrow("Hostname missing.com not found in Cloudflare");
    });

    it("should omit verification_errors when not present", async () => {
      mockSdk.customHostnames.list.mockResolvedValue({
        result: [{ hostname: "shop.acme.com", status: "active" }],
      });

      const result = await provider.getHostnameStatus(
        "tenant-1",
        "shop.acme.com",
      );

      expect(result).toEqual({ status: "active" });
      expect(result).not.toHaveProperty("verification_errors");
    });
  });

  // ---------------------------------------------------------------------------
  describe("createDnsRecord", () => {
    it("should create a CNAME record", async () => {
      mockSdk.dns.records.create.mockResolvedValue({ id: "rec-1" });

      const result = await provider.createDnsRecord({
        type: "CNAME",
        name: "acme-my.vendin.store",
        content: "storefront.vendin.store",
        proxied: true,
        comment: "test",
      });

      expect(result).toEqual({ id: "rec-1" });
      expect(mockSdk.dns.records.create).toHaveBeenCalledWith(
        expect.objectContaining({
          zone_id: "zone-1",
          type: "CNAME",
          name: "acme-my.vendin.store",
        }),
      );
    });

    it("should rethrow on error", async () => {
      mockSdk.dns.records.create.mockRejectedValue(new Error("dns error"));

      await expect(
        provider.createDnsRecord({
          type: "A",
          name: "test",
          content: "1.2.3.4",
        }),
      ).rejects.toThrow("dns error");
    });
  });
});
