import { type Logger } from "../../utils/logger";

import {
  SubdomainInUseError,
  SubdomainRequiredError,
  TenantNotFoundError,
} from "./tenant.errors";

import type { ProvisioningService } from "../provisioning/provisioning.service";
import type { TenantRepository } from "./tenant.repository";
import type {
  CreateTenantInput,
  ListTenantsFilters,
  Tenant,
  UpdateTenantInput,
} from "./tenant.types";

interface TenantServiceConfig {
  logger: Logger;
  gcpProjectId?: string | undefined;
  gcpRegion?: string | undefined;
  tenantBaseDomain?: string | undefined;
}

/**
 * Service class for handling tenant-related business logic, including provisioning coordination.
 */
export class TenantService {
  private logger: Logger;
  private gcpProjectId: string | undefined;
  private gcpRegion: string | undefined;
  private tenantBaseDomain: string;

  constructor(
    private repository: TenantRepository,
    private provisioningService: ProvisioningService,
    config: TenantServiceConfig,
  ) {
    this.logger = config.logger;
    this.gcpProjectId = config.gcpProjectId;
    this.gcpRegion = config.gcpRegion;
    this.tenantBaseDomain = config.tenantBaseDomain as string;
  }

  /**
   * Creates a new tenant and triggers the provisioning workflow.
   *
   * @param input - The data needed to create the tenant.
   * @param baseUrl - The base URL of the control plane API for workflow callbacks.
   * @returns The newly created tenant record.
   * @throws \{SubdomainInUseError\} If the subdomain is already taken.
   * @throws \{SubdomainRequiredError\} If a subdomain is not provided.
   * @throws If tenant creation or workflow triggering fails.
   */
  async createTenant(
    input: CreateTenantInput,
    baseUrl: string,
  ): Promise<Tenant> {
    if (input.subdomain) {
      const existing = await this.repository.findBySubdomain(input.subdomain);
      if (existing) {
        throw new SubdomainInUseError();
      }
    } else {
      throw new SubdomainRequiredError();
    }

    // 1. Create tenant record with status 'provisioning'
    const tenant = await this.repository.create({
      ...input,
      // status will default to 'provisioning' via schema default
    });

    // 2. Trigger Cloud Workflow
    if (this.gcpProjectId && this.gcpRegion) {
      try {
        await this.provisioningService.triggerProvisioningWorkflow(
          tenant.id,
          baseUrl,
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          { tenantId: tenant.id, error },
          "Failed to trigger provisioning workflow",
        );
        await this.repository.update(tenant.id, {
          status: "provisioning_failed",
          failureReason: errorMessage,
        });
        throw error;
      }
    } else {
      this.logger.warn(
        { tenantId: tenant.id },
        "GCP Project/Region not configured. Workflow skipped.",
      );
    }

    return tenant;
  }

  // --- Helper Methods ---

  // --- CRUD Methods ---

  /**
   * Retrieves a tenant by its unique identifier.
   *
   * @param id - The unique identifier of the tenant.
   * @returns The tenant record.
   * @throws {TenantNotFoundError} If the tenant is not found.
   */
  async getTenant(id: string): Promise<Tenant> {
    const tenant = await this.repository.findById(id);
    if (!tenant) {
      throw new TenantNotFoundError();
    }
    return tenant;
  }

  /**
   * Updates an existing tenant record with the provided input.
   *
   * @param id - The unique identifier of the tenant to update.
   * @param input - The data to update on the tenant.
   * @returns The updated tenant record.
   * @throws {TenantNotFoundError} If the tenant is not found.
   * @throws {SubdomainInUseError} If the new subdomain is already in use by another tenant.
   */
  async updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
    if (input.subdomain) {
      const existing = await this.repository.findBySubdomain(input.subdomain);
      if (existing && existing.id !== id) {
        throw new SubdomainInUseError();
      }
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new TenantNotFoundError();
    }
    return updated;
  }

  /**
   * Soft deletes a tenant record.
   *
   * @param id - The unique identifier of the tenant to delete.
   * @throws {TenantNotFoundError} If the tenant is not found.
   */
  async deleteTenant(id: string): Promise<void> {
    const deleted = await this.repository.softDelete(id);
    if (!deleted) {
      throw new TenantNotFoundError();
    }
    // TODO: Trigger resource cleanup (database, etc.)
  }

  async logProvisioningEvent(
    tenantId: string,
    step: string,
    status: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.repository.logProvisioningEvent(tenantId, step, status, details);
  }

  /**
   * Retrieves a list of all tenants, optionally filtered.
   *
   * @param filters - Optional filters to apply to the query.
   * @returns An array of tenant records.
   * @throws If fetching tenants from the database fails.
   */
  async listTenants(filters?: ListTenantsFilters): Promise<Tenant[]> {
    if (filters?.subdomain) {
      let lookup = filters.subdomain;

      if (
        lookup.endsWith(this.tenantBaseDomain) &&
        lookup !== this.tenantBaseDomain
      ) {
        lookup = lookup
          .slice(0, -this.tenantBaseDomain.length)
          .replace(/\.$/, ""); // Remove trailing dot
      }

      const tenant = await this.repository.findBySubdomain(lookup);
      return tenant ? [tenant] : [];
    }
    const tenants = await this.repository.findAll();
    return tenants;
  }
}
