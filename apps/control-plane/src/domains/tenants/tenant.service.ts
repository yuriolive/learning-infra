import { createLogger } from "@vendin/utils/logger";

import { NeonProvider } from "../../providers/neon/neon.client";

import type { TenantRepository } from "./tenant.repository";
import type {
  CreateTenantInput,
  Tenant,
  UpdateTenantInput,
} from "./tenant.types";

const logger = createLogger({
  logLevel: process.env.LOG_LEVEL,
  nodeEnv: process.env.NODE_ENV ?? "development",
});

export class TenantService {
  private neonProvider: NeonProvider | null = null;

  constructor(private repository: TenantRepository) {
    // We initialize NeonProvider lazily or check env vars to support dev mode without Neon
    // But for this task, we assume we want to use it if configured.
    try {
      if (process.env.NEON_API_KEY && process.env.NEON_PROJECT_ID) {
        this.neonProvider = new NeonProvider();
      } else {
        logger.warn(
          "Neon credentials not found. Database provisioning will be skipped.",
        );
      }
    } catch (error) {
      logger.error({ error }, "Failed to initialize NeonProvider");
    }
  }

  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    if (input.subdomain) {
      const existing = await this.repository.findBySubdomain(input.subdomain);
      if (existing) {
        throw new Error("Subdomain already in use");
      }
    }

    // 1. Create tenant record with status 'provisioning'
    const tenant = await this.repository.create({
      ...input,
      // status will default to 'provisioning' via schema default
    });

    // 2. Provision Database (Background process or sync)
    // For MVP we do it synchronously to ensure valid state or fail fast
    if (this.neonProvider) {
      try {
        logger.info(
          { tenantId: tenant.id },
          "Provisioning database for tenant",
        );

        const databaseUrl = await this.neonProvider.createTenantDatabase(
          tenant.id,
        );

        // 3. Update tenant with database URL and set status to active (or 'provisioning' if more steps)
        // Since we don't have Cloud Run provisioning yet, we might keep it 'provisioning'
        // OR set it to 'active' for the database part.
        // The PRD says "Single tenant can be provisioned end-to-end".
        // For now, let's update the databaseUrl. Status update might depend on other steps.
        // We will keep status as 'provisioning' until the full flow is ready,
        // OR set to 'active' if this is the only step we have for now and want to test.
        // Let's update databaseUrl.

        const updated = await this.repository.update(tenant.id, {
          databaseUrl,
          // We keep status as provisioning because API url is still missing
          // status: "active"
        });

        if (updated) {
          return updated;
        }
      } catch (error) {
        logger.error(
          { error, tenantId: tenant.id },
          "Failed to provision database",
        );
        // Rollback: Mark as provisioning_failed
        await this.repository.update(tenant.id, {
          status: "provisioning_failed",
        });
        throw new Error("Failed to provision database resource");
      }
    }

    return tenant;
  }

  async getTenant(id: string): Promise<Tenant> {
    const tenant = await this.repository.findById(id);
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    return tenant;
  }

  async updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
    if (input.subdomain) {
      const existing = await this.repository.findBySubdomain(input.subdomain);
      if (existing && existing.id !== id) {
        throw new Error("Subdomain already in use");
      }
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new Error("Tenant not found");
    }
    return updated;
  }

  async deleteTenant(id: string): Promise<void> {
    const deleted = await this.repository.softDelete(id);
    if (!deleted) {
      throw new Error("Tenant not found");
    }
    // TODO: Trigger resource cleanup (database, etc.)
  }

  async listTenants(): Promise<Tenant[]> {
    const tenants = await this.repository.findAll();
    return tenants;
  }
}
