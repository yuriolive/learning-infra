import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";

import { mockLogger } from "../../../tests/utils/test-utilities";

import {
  SubdomainInUseError,
  SubdomainRequiredError,
  TenantNotFoundError,
} from "./tenant.errors";
import { TenantService } from "./tenant.service";

import type { Logger } from "../../utils/logger";
import type { ProvisioningService } from "../provisioning/provisioning.service";
import type { TenantRepository } from "./tenant.repository";
import type { Tenant } from "./tenant.types";

// Define mock factories
const mockTenantRepository = {
  create: vi.fn(),
  findBySubdomain: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  findAll: vi.fn(),
  logProvisioningEvent: vi.fn(),
} as unknown as Mocked<TenantRepository>;

const mockProvisioningService = {
  tenantBaseDomain: "vendin.store",
  triggerProvisioningWorkflow: vi.fn(),
} as unknown as Mocked<ProvisioningService>;

describe("TenantService", () => {
  let service: TenantService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantService(mockTenantRepository, mockProvisioningService, {
      logger: mockLogger as unknown as Logger,
      gcpProjectId: "test-project",
      gcpRegion: "test-region",
      tenantBaseDomain: "vendin.store",
    });
  });

  describe("createTenant", () => {
    it("should throw SubdomainRequiredError if subdomain is missing", async () => {
      await expect(
        service.createTenant(
          { name: "Test", merchantEmail: "test@example.com" },
          "http://localhost",
        ),
      ).rejects.toThrow(SubdomainRequiredError);
    });

    it("should throw SubdomainInUseError if subdomain exists", async () => {
      mockTenantRepository.findBySubdomain.mockResolvedValue({
        id: "existing",
      } as Tenant);
      await expect(
        service.createTenant(
          {
            name: "Test",
            merchantEmail: "test@example.com",
            subdomain: "existing",
          },
          "http://localhost",
        ),
      ).rejects.toThrow(SubdomainInUseError);
    });

    it("should create tenant and trigger workflow", async () => {
      const input = {
        name: "Test",
        merchantEmail: "test@example.com",
        subdomain: "new-tenant",
      };
      const createdTenant = {
        ...input,
        id: "tenant-1",
        status: "provisioning",
      };
      mockTenantRepository.findBySubdomain.mockResolvedValue(null);
      mockTenantRepository.create.mockResolvedValue(createdTenant as Tenant);

      const result = await service.createTenant(input, "http://localhost");

      expect(result).toEqual(createdTenant);
      expect(mockTenantRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(input),
      );
      expect(
        mockProvisioningService.triggerProvisioningWorkflow,
      ).toHaveBeenCalledWith("tenant-1", "http://localhost");
    });

    it("should skip workflow if GCP config is missing", async () => {
      const serviceWithoutGcp = new TenantService(
        mockTenantRepository,
        mockProvisioningService,
        {
          logger: mockLogger as unknown as Logger,
          // No GCP config
          tenantBaseDomain: "vendin.store",
        },
      );

      const input = {
        name: "Test",
        merchantEmail: "test@example.com",
        subdomain: "new-tenant",
      };
      const createdTenant = {
        ...input,
        id: "tenant-1",
        status: "provisioning",
      };
      mockTenantRepository.findBySubdomain.mockResolvedValue(null);
      mockTenantRepository.create.mockResolvedValue(createdTenant as Tenant);

      await serviceWithoutGcp.createTenant(input, "http://localhost");

      expect(
        mockProvisioningService.triggerProvisioningWorkflow,
      ).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "tenant-1" }),
        expect.stringContaining("GCP Project/Region not configured"),
      );
    });

    it("should handle workflow trigger failure", async () => {
      const input = {
        name: "Test",
        merchantEmail: "test@example.com",
        subdomain: "fail-tenant",
      };
      const createdTenant = {
        ...input,
        id: "tenant-1",
        status: "provisioning",
      };
      mockTenantRepository.findBySubdomain.mockResolvedValue(null);
      mockTenantRepository.create.mockResolvedValue(createdTenant as Tenant);

      const error = new Error("Workflow Error");
      mockProvisioningService.triggerProvisioningWorkflow.mockRejectedValue(
        error,
      );

      await expect(
        service.createTenant(input, "http://localhost"),
      ).rejects.toThrow(error);

      expect(mockTenantRepository.update).toHaveBeenCalledWith("tenant-1", {
        status: "provisioning_failed",
        failureReason: "Workflow Error",
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("getTenant", () => {
    it("should return tenant if found", async () => {
      const tenant = { id: "tenant-1", name: "Test" };
      mockTenantRepository.findById.mockResolvedValue(tenant as Tenant);

      const result = await service.getTenant("tenant-1");
      expect(result).toEqual(tenant);
    });

    it("should throw TenantNotFoundError if not found", async () => {
      mockTenantRepository.findById.mockResolvedValue(null);
      await expect(service.getTenant("tenant-1")).rejects.toThrow(
        TenantNotFoundError,
      );
    });
  });

  describe("updateTenant", () => {
    it("should update tenant if found", async () => {
      const input = { name: "Updated" };
      const updatedTenant = { id: "tenant-1", ...input };
      mockTenantRepository.update.mockResolvedValue(updatedTenant as Tenant);

      const result = await service.updateTenant("tenant-1", input);
      expect(result).toEqual(updatedTenant);
    });

    it("should check subdomain uniqueness if subdomain changes", async () => {
      mockTenantRepository.findBySubdomain.mockResolvedValue({
        id: "other-tenant",
      } as Tenant);

      await expect(
        service.updateTenant("tenant-1", { subdomain: "taken" }),
      ).rejects.toThrow(SubdomainInUseError);
    });

    it("should allow updating to a unique subdomain", async () => {
      mockTenantRepository.findBySubdomain.mockResolvedValue(null);
      const updatedTenant = {
        id: "tenant-1",
        name: "Test",
        subdomain: "new-unique-sub",
      };
      mockTenantRepository.update.mockResolvedValue(updatedTenant as Tenant);

      const result = await service.updateTenant("tenant-1", {
        subdomain: "new-unique-sub",
      });

      expect(mockTenantRepository.findBySubdomain).toHaveBeenCalledWith(
        "new-unique-sub",
      );
      expect(result).toEqual(updatedTenant);
    });

    it("should throw TenantNotFoundError if update fails (not found)", async () => {
      mockTenantRepository.update.mockResolvedValue(null);
      await expect(
        service.updateTenant("tenant-1", { name: "Updated" }),
      ).rejects.toThrow(TenantNotFoundError);
    });
  });

  describe("deleteTenant", () => {
    it("should delete tenant if found", async () => {
      mockTenantRepository.softDelete.mockResolvedValue(true);
      await service.deleteTenant("tenant-1");
      expect(mockTenantRepository.softDelete).toHaveBeenCalledWith("tenant-1");
    });

    it("should throw TenantNotFoundError if not found", async () => {
      mockTenantRepository.softDelete.mockResolvedValue(false);
      await expect(service.deleteTenant("tenant-1")).rejects.toThrow(
        TenantNotFoundError,
      );
    });
  });

  describe("listTenants", () => {
    it("should return all tenants if no filters", async () => {
      const tenants = [{ id: "t1" }, { id: "t2" }];
      mockTenantRepository.findAll.mockResolvedValue(tenants as Tenant[]);

      const result = await service.listTenants();
      expect(result).toEqual(tenants);
    });

    it("should filter by subdomain", async () => {
      const tenant = { id: "t1", subdomain: "sub" };
      mockTenantRepository.findBySubdomain.mockResolvedValue(tenant as Tenant);

      const result = await service.listTenants({ subdomain: "sub" });
      expect(result).toEqual([tenant]);
      expect(mockTenantRepository.findBySubdomain).toHaveBeenCalledWith("sub");
    });

    it("should strip base domain from subdomain lookup", async () => {
      const tenant = { id: "t1", subdomain: "sub" };
      mockTenantRepository.findBySubdomain.mockResolvedValue(tenant as Tenant);

      const result = await service.listTenants({
        subdomain: "sub.vendin.store",
      });
      expect(result).toEqual([tenant]);
      expect(mockTenantRepository.findBySubdomain).toHaveBeenCalledWith("sub.");
    });
  });
});
