import { describe, it, expect, vi, beforeEach } from "vitest";

import { type CloudflareProvider } from "../../providers/cloudflare/cloudflare.client";
import { type Logger } from "../../utils/logger";
import { type TenantRepository } from "../tenants/tenant.repository";

import { DomainProvisioningService } from "./domain-provisioning.service";

// Mock dependencies
const mockCloudflareProvider = {
  createDnsRecord: vi.fn(),
  createCustomHostname: vi.fn(),
};

const mockTenantRepository = {
  findById: vi.fn(),
  update: vi.fn(),
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("DomainProvisioningService", () => {
  let service: DomainProvisioningService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DomainProvisioningService({
      tenantRepository: mockTenantRepository as unknown as TenantRepository,
      cloudflareProvider:
        mockCloudflareProvider as unknown as CloudflareProvider,
      logger: mockLogger as unknown as Logger,
      tenantBaseDomain: "-my.vendin.store",
      storefrontHostname: "store.vendin.store",
    });
  });

  describe("configureDomain", () => {
    it("should create CNAME for default domain", async () => {
      const tenantId = "tenant-1";
      const tenant = {
        id: tenantId,
        subdomain: "my-tenant",
        metadata: {},
      };
      mockTenantRepository.findById.mockResolvedValue(tenant);

      await service.configureDomain(tenantId);

      expect(mockTenantRepository.findById).toHaveBeenCalledWith(tenantId);
      // Default domain: my-tenant-my.vendin.store
      const expectedHostname = "my-tenant-my.vendin.store";

      expect(mockCloudflareProvider.createDnsRecord).toHaveBeenCalledWith({
        type: "CNAME",
        name: expectedHostname,
        content: "store.vendin.store",
        proxied: true,
        comment: expect.stringContaining(tenantId),
      });
      expect(
        mockCloudflareProvider.createCustomHostname,
      ).not.toHaveBeenCalled();
    });

    it("should create custom hostname for custom domain", async () => {
      const tenantId = "tenant-2";
      const tenant = {
        id: tenantId,
        subdomain: "example.com",
        metadata: {},
      };
      mockTenantRepository.findById.mockResolvedValue(tenant);
      mockCloudflareProvider.createCustomHostname.mockResolvedValue({});

      await service.configureDomain(tenantId);

      expect(mockCloudflareProvider.createCustomHostname).toHaveBeenCalledWith(
        tenantId,
        "example.com",
      );
      expect(mockCloudflareProvider.createDnsRecord).not.toHaveBeenCalled();
    });

    it("should handle ACME validation for custom domain", async () => {
      const tenantId = "tenant-3";
      const tenant = {
        id: tenantId,
        subdomain: "app.custom.com",
        metadata: { key: "val" },
      };
      mockTenantRepository.findById.mockResolvedValue(tenant);

      const validationResult = {
        ssl: {
          validation_records: [
            {
              http_url:
                "http://app.custom.com/.well-known/acme-challenge/TOKEN123",
              http_body: "RESPONSE456",
            },
          ],
        },
      };
      mockCloudflareProvider.createCustomHostname.mockResolvedValue(
        validationResult,
      );

      await service.configureDomain(tenantId);

      expect(mockTenantRepository.update).toHaveBeenCalledWith(tenantId, {
        metadata: {
          key: "val",
          acmeChallenge: {
            token: "TOKEN123",
            response: "RESPONSE456",
          },
        },
      });
    });

    it("should ignore duplicate CNAME creation error", async () => {
      const tenantId = "tenant-4";
      const tenant = {
        id: tenantId,
        subdomain: "dup-tenant",
        metadata: {},
      };
      mockTenantRepository.findById.mockResolvedValue(tenant);

      // Simulate error
      const error: unknown = new Error("Record already exists");
      (error as Record<string, unknown>).code = 81_053;
      mockCloudflareProvider.createDnsRecord.mockRejectedValue(error);

      await service.configureDomain(tenantId);

      // Should not throw
      expect(mockCloudflareProvider.createDnsRecord).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        expect.stringContaining("Failed to create CNAME record"),
      );
    });
  });
});
