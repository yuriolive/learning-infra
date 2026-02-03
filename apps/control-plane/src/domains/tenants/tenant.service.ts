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
  Tenant,
  UpdateTenantInput,
} from "./tenant.types";

interface TenantServiceConfig {
  logger: Logger;
  gcpProjectId?: string | undefined;
  gcpRegion?: string | undefined;
}

export class TenantService {
  private logger: Logger;
  private gcpProjectId: string | undefined;
  private gcpRegion: string | undefined;

  constructor(
    private repository: TenantRepository,
    private provisioningService: ProvisioningService,
    config: TenantServiceConfig,
  ) {
    this.logger = config.logger;
    this.gcpProjectId = config.gcpProjectId;
    this.gcpRegion = config.gcpRegion;
  }

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

  async getTenant(id: string): Promise<Tenant> {
    const tenant = await this.repository.findById(id);
    if (!tenant) {
      throw new TenantNotFoundError();
    }
    return tenant;
  }

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

  async listTenants(): Promise<Tenant[]> {
    const tenants = await this.repository.findAll();
    return tenants;
  }
}
