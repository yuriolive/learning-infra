import { type createLogger } from "@vendin/utils/logger";

import { CloudflareProvider } from "../../providers/cloudflare/cloudflare.client";
import { CloudRunProvider } from "../../providers/gcp/cloud-run.client";
import { SecretManagerProvider } from "../../providers/gcp/secret-manager.client";
import { NeonProvider } from "../../providers/neon/neon.client";

import type { TenantRepository } from "./tenant.repository";
import type {
  CreateTenantInput,
  Tenant,
  UpdateTenantInput,
} from "./tenant.types";

interface TenantServiceConfig {
  neonApiKey?: string | undefined;
  neonProjectId?: string | undefined;
  logger: ReturnType<typeof createLogger>;
}

export class TenantService {
  private neonProvider: NeonProvider | null = null;
  private cloudRunProvider: CloudRunProvider;
  private secretManagerProvider: SecretManagerProvider;
  private cloudflareProvider: CloudflareProvider;
  private logger: ReturnType<typeof createLogger>;

  constructor(
    private repository: TenantRepository,
    config: TenantServiceConfig,
  ) {
    this.logger = config.logger;
    try {
      if (config.neonApiKey && config.neonProjectId) {
        this.neonProvider = new NeonProvider();
      } else {
        this.logger.warn(
          "Neon credentials not found. Database provisioning will be skipped.",
        );
      }
    } catch (error) {
      this.logger.error({ error }, "Failed to initialize NeonProvider");
    }

    this.cloudRunProvider = new CloudRunProvider();
    this.secretManagerProvider = new SecretManagerProvider();
    this.cloudflareProvider = new CloudflareProvider();
  }

  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    if (input.subdomain) {
      const existing = await this.repository.findBySubdomain(input.subdomain);
      if (existing) {
        throw new Error("Subdomain already in use");
      }
    }

    // 0. Pre-flight checks: Validate R2 Access
    try {
      // We only validate if Neon is also enabled, implying full provisioning mode?
      // Or always validate? If we are in local dev without R2 creds, this might block.
      // But CloudflareProvider constructor allows missing creds (logs warning), and validateR2Access fails if so.
      // If we want to allow "stub" mode, we should check.
      // Assuming if Neon is present, we are in a provisioning environment.
      if (this.neonProvider) {
        const r2Valid = await this.cloudflareProvider.validateR2Access();
        if (!r2Valid) {
          this.logger.error("R2 storage validation failed");
          throw new Error("R2 storage configuration is invalid");
        }
      }
    } catch (error) {
      this.logger.error({ error }, "Pre-flight check failed");
      throw error;
    }

    // 1. Create tenant record with status 'provisioning'
    const tenant = await this.repository.create({
      ...input,
      // status will default to 'provisioning' via schema default
    });

    // 2. Provision Database (Background process or sync)
    if (this.neonProvider) {
      try {
        this.logger.info(
          { tenantId: tenant.id },
          "Provisioning database for tenant",
        );

        const databaseUrl = await this.neonProvider.createTenantDatabase(
          tenant.id,
        );

        // 3. Create Secret for Database URL
        this.logger.info(
          { tenantId: tenant.id },
          "Creating database URL secret",
        );
        const secretName = `tenant-${tenant.id}-db-url`;
        const secretVersion = await this.secretManagerProvider.createSecret(
          secretName,
          databaseUrl,
        );

        // 4. Deploy Cloud Run Service
        this.logger.info(
          { tenantId: tenant.id },
          "Deploying Cloud Run service",
        );
        const apiUrl = await this.cloudRunProvider.deployTenantService(
          tenant.id,
          secretVersion,
        );

        // 5. Update tenant with database URL and API URL, set status to active
        const updated = await this.repository.update(tenant.id, {
          databaseUrl,
          apiUrl,
          status: "active",
        });

        if (updated) {
          return updated;
        }
      } catch (error) {
        this.logger.error(
          { error, tenantId: tenant.id },
          "Failed to provision tenant resources",
        );
        // Rollback: Mark as provisioning_failed
        await this.repository.update(tenant.id, {
          status: "provisioning_failed",
        });
        throw new Error(
          `Failed to provision tenant resources: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else {
      this.logger.warn(
        "Skipping infrastructure provisioning (Neon provider missing)",
      );
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
