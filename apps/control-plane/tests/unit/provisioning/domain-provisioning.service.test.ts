import { createLogger } from "@vendin/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DomainProvisioningService } from "../../../src/domains/provisioning/domain-provisioning.service";

import type { TenantRepository } from "../../../src/domains/tenants/tenant.repository";
import type { CloudflareProvider } from "../../../src/providers/cloudflare/cloudflare.client";

const logger = createLogger({ logLevel: "silent" });

describe("DomainProvisioningService", () => {
  let service: DomainProvisioningService;
  let mockRepository: Pick<TenantRepository, "findById" | "update">;
  let mockCloudflare: Pick<
    CloudflareProvider,
    "createDnsRecord" | "createCustomHostname"
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      findById: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    };

    mockCloudflare = {
      createDnsRecord: vi.fn().mockResolvedValue({}),
      createCustomHostname: vi.fn().mockResolvedValue({ ssl: {} }),
    };

    service = new DomainProvisioningService({
      tenantRepository: mockRepository as unknown as TenantRepository,
      cloudflareProvider: mockCloudflare as unknown as CloudflareProvider,
      logger,
      tenantBaseDomain: "-my.vendin.store",
      storefrontHostname: "storefront.vendin.store",
    });
  });

  describe("configureDomain", () => {
    it("should throw if tenant not found", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.configureDomain("tenant-1")).rejects.toThrow(
        "Subdomain missing",
      );
    });

    it("should throw if tenant has no subdomain", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue({
        id: "tenant-1",
        subdomain: null,
      } as never);

      await expect(service.configureDomain("tenant-1")).rejects.toThrow(
        "Subdomain missing",
      );
    });

    describe("default domain (no dot in subdomain)", () => {
      beforeEach(() => {
        vi.mocked(mockRepository.findById).mockResolvedValue({
          id: "tenant-1",
          subdomain: "acme",
          metadata: {},
        } as never);
      });

      it("should create a proxied CNAME for the default domain", async () => {
        await service.configureDomain("tenant-1");

        expect(mockCloudflare.createDnsRecord).toHaveBeenCalledWith({
          type: "CNAME",
          name: "acme-my.vendin.store",
          content: "storefront.vendin.store",
          proxied: true,
          comment: "Default domain for tenant tenant-1",
        });
        expect(mockCloudflare.createCustomHostname).not.toHaveBeenCalled();
      });

      it("should silently ignore duplicate CNAME error (code 81053)", async () => {
        vi.mocked(mockCloudflare.createDnsRecord).mockRejectedValue({
          code: 81_053,
        });

        await expect(
          service.configureDomain("tenant-1"),
        ).resolves.not.toThrow();
      });

      it("should silently ignore duplicate CNAME error (code 81057)", async () => {
        vi.mocked(mockCloudflare.createDnsRecord).mockRejectedValue({
          response: { body: { errors: [{ code: 81_057 }] } },
        });

        await expect(
          service.configureDomain("tenant-1"),
        ).resolves.not.toThrow();
      });

      it("should rethrow unexpected DNS errors", async () => {
        vi.mocked(mockCloudflare.createDnsRecord).mockRejectedValue(
          new Error("network error"),
        );

        await expect(service.configureDomain("tenant-1")).rejects.toThrow(
          "network error",
        );
      });
    });

    describe("custom domain (dot in subdomain)", () => {
      beforeEach(() => {
        vi.mocked(mockRepository.findById).mockResolvedValue({
          id: "tenant-1",
          subdomain: "shop.acme.com",
          metadata: {},
        } as never);
      });

      it("should create a custom hostname for a custom domain", async () => {
        await service.configureDomain("tenant-1");

        expect(mockCloudflare.createCustomHostname).toHaveBeenCalledWith(
          "tenant-1",
          "shop.acme.com",
        );
        expect(mockCloudflare.createDnsRecord).not.toHaveBeenCalled();
      });

      it("should store ACME validation challenge when present in response", async () => {
        vi.mocked(mockCloudflare.createCustomHostname).mockResolvedValue({
          ssl: {
            validation_records: [
              {
                http_url:
                  "http://shop.acme.com/.well-known/acme-challenge/tok123",
                http_body: "tok123.fingerprint",
              },
            ],
          },
        } as never);

        await service.configureDomain("tenant-1");

        expect(mockRepository.update).toHaveBeenCalledWith("tenant-1", {
          metadata: {
            acmeChallenge: {
              token: "tok123",
              response: "tok123.fingerprint",
            },
          },
        });
      });

      it("should not update metadata when no ACME validation records", async () => {
        vi.mocked(mockCloudflare.createCustomHostname).mockResolvedValue({
          ssl: { validation_records: [] },
        } as never);

        await service.configureDomain("tenant-1");

        expect(mockRepository.update).not.toHaveBeenCalled();
      });
    });
  });
});
