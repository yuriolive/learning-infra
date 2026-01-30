import { randomBytes } from "node:crypto";

import { type createLogger } from "@vendin/utils/logger";

import { CloudRunProvider } from "../../providers/gcp/cloud-run.client";
import { NeonProvider } from "../../providers/neon/neon.client";

import {
  SubdomainInUseError,
  SubdomainRequiredError,
  TenantNotFoundError,
} from "./tenant.errors";

import type { TenantRepository } from "./tenant.repository";
import type {
  CreateTenantInput,
  Tenant,
  UpdateTenantInput,
} from "./tenant.types";

interface TenantServiceConfig {
  neonApiKey?: string | undefined;
  neonProjectId?: string | undefined;
  gcpCredentialsJson?: string | undefined;
  gcpProjectId?: string | undefined;
  gcpRegion?: string | undefined;
  tenantImageTag?: string | undefined;
  upstashRedisUrl?: string | undefined;
  cloudRunServiceAccount?: string | undefined;
  logger: ReturnType<typeof createLogger>;
}

export class TenantService {
  private neonProvider: NeonProvider | null = null;
  private cloudRunProvider: CloudRunProvider | null = null;
  private upstashRedisUrl: string | undefined;
  private logger: ReturnType<typeof createLogger>;

  constructor(
    private repository: TenantRepository,
    config: TenantServiceConfig,
  ) {
    this.logger = config.logger;
    this.upstashRedisUrl = config.upstashRedisUrl;

    try {
      if (config.neonApiKey && config.neonProjectId) {
        this.neonProvider = new NeonProvider({
          apiKey: config.neonApiKey,
          projectId: config.neonProjectId,
          logger: this.logger,
        });
      } else {
        this.logger.warn(
          "Neon credentials not found. Database provisioning will be skipped.",
        );
      }

      const region = config.gcpRegion || "southamerica-east1";

      if (config.gcpProjectId && config.tenantImageTag) {
        this.cloudRunProvider = new CloudRunProvider({
          credentialsJson: config.gcpCredentialsJson,
          projectId: config.gcpProjectId,
          region,
          tenantImageTag: config.tenantImageTag,
          logger: this.logger,
          ...(config.cloudRunServiceAccount
            ? { serviceAccount: config.cloudRunServiceAccount }
            : {}),
        });
      } else {
        this.logger.warn(
          "GCP config not found. Cloud Run deployment will be skipped.",
        );
      }
    } catch (error) {
      this.logger.error({ error }, "Failed to initialize providers");
    }
  }

  async createTenant(
    input: CreateTenantInput,
    waitUntil?: (promise: Promise<unknown>) => void,
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

    // 2. Trigger background provisioning
    if (this.neonProvider && this.cloudRunProvider && waitUntil) {
      waitUntil(
        this.provisionResources(
          this.neonProvider,
          this.cloudRunProvider,
          tenant.id,
          input.subdomain,
          tenant.redisHash,
        ),
      );
    } else {
      this.logger.warn(
        { tenantId: tenant.id },
        "Provisioning skipped due to missing providers or waitUntil context",
      );
    }

    return tenant;
  }

  private async provisionResources(
    neonProvider: NeonProvider,
    cloudRunProvider: CloudRunProvider,
    tenantId: string,
    subdomain: string,
    redisHash: string | null,
  ) {
    try {
      this.logger.info({ tenantId }, "Starting background provisioning");

      if (!this.upstashRedisUrl) {
        throw new Error("Missing Upstash Redis URL");
      }

      if (!redisHash) {
        throw new Error("Redis hash missing");
      }

      // 1. Provision Database
      const databaseUrl = await neonProvider.createTenantDatabase(tenantId);

      // Save databaseUrl immediately
      await this.repository.update(tenantId, { databaseUrl });

      // 2. Generate Secrets
      const cookieSecret = randomBytes(32).toString("hex");
      const jwtSecret = randomBytes(32).toString("hex");

      // 3. Prepare Environment
      const redisPrefix = `t_${redisHash}:`;

      const environmentVariables = {
        DATABASE_URL: databaseUrl,
        REDIS_URL: this.upstashRedisUrl,
        REDIS_PREFIX: redisPrefix,
        COOKIE_SECRET: cookieSecret,
        JWT_SECRET: jwtSecret,
        HOST: "0.0.0.0",
        NODE_ENV: "production",
        STORE_CORS: `https://${subdomain}.vendin.store,http://localhost:9000,https://vendin.store`,
        ADMIN_CORS: `https://${subdomain}.vendin.store,http://localhost:9000,https://vendin.store`,
      };

      // 4. Run Migrations
      await cloudRunProvider.runTenantMigrations(
        tenantId,
        environmentVariables,
      );

      // 5. Deploy Cloud Run
      const apiUrl = await cloudRunProvider.deployTenantInstance(
        tenantId,
        environmentVariables,
      );

      // 6. Final Update
      await this.repository.update(tenantId, {
        apiUrl,
        status: "active",
      });

      this.logger.info({ tenantId }, "Successfully provisioned resources");
    } catch (error) {
      this.logger.error({ error, tenantId }, "Provisioning resources failed");

      // Rollback any resources that might have been created
      await this.rollbackProvisioning(tenantId);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.repository.update(tenantId, {
        status: "provisioning_failed",
        failureReason: errorMessage,
      });
    }
  }

  private async rollbackProvisioning(tenantId: string) {
    this.logger.info({ tenantId }, "Rolling back provisioned resources");

    if (this.neonProvider && this.cloudRunProvider) {
      const results = await Promise.allSettled([
        this.neonProvider.deleteTenantDatabase(tenantId),
        this.cloudRunProvider.deleteTenantInstance(tenantId),
      ]);

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        this.logger.error(
          {
            tenantId,
            errors: failed.map((r) => (r as PromiseRejectedResult).reason),
          },
          "Rollback partially failed",
        );
      } else {
        this.logger.info({ tenantId }, "Rollback successful");
      }
    }
  }

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

  async listTenants(): Promise<Tenant[]> {
    const tenants = await this.repository.findAll();
    return tenants;
  }
}
