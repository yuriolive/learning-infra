import { randomBytes } from "node:crypto";

import { ExecutionsClient } from "@google-cloud/workflows";
import { type createLogger } from "@vendin/utils/logger";

import {
  CloudRunProvider,
  type MigrationStatus,
} from "../../providers/gcp/cloud-run.client";
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
  internalApiKey?: string | undefined;
  logger: ReturnType<typeof createLogger>;
}

export class TenantService {
  private neonProvider: NeonProvider | null = null;
  private cloudRunProvider: CloudRunProvider | null = null;
  private executionsClient: ExecutionsClient;
  private upstashRedisUrl: string | undefined;
  private internalApiKey: string | undefined;
  private logger: ReturnType<typeof createLogger>;
  private gcpProjectId: string | undefined;
  private gcpRegion: string | undefined;

  constructor(
    private repository: TenantRepository,
    config: TenantServiceConfig,
  ) {
    this.logger = config.logger;
    this.upstashRedisUrl = config.upstashRedisUrl;
    this.internalApiKey = config.internalApiKey;
    this.gcpProjectId = config.gcpProjectId;
    this.gcpRegion = config.gcpRegion;

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

      if (config.gcpProjectId && config.gcpRegion && config.tenantImageTag) {
        this.cloudRunProvider = new CloudRunProvider({
          credentialsJson: config.gcpCredentialsJson,
          projectId: config.gcpProjectId,
          region: config.gcpRegion,
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

      const clientOptions: { credentials?: object; keyFilename?: string } = {};
      if (config.gcpCredentialsJson) {
        try {
          const credentials = JSON.parse(config.gcpCredentialsJson);
          clientOptions.credentials = credentials;
        } catch {
          clientOptions.keyFilename = config.gcpCredentialsJson;
        }
      }
      this.executionsClient = new ExecutionsClient(clientOptions);
    } catch (error) {
      this.logger.error({ error }, "Failed to initialize providers");
      // Fallback for executions client to avoid crash if init fails, though it likely won't work
      this.executionsClient = new ExecutionsClient();
    }
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
        const workflowName = `projects/${this.gcpProjectId}/locations/${this.gcpRegion}/workflows/provision-tenant`;
        const executionArguments = {
          tenantId: tenant.id,
          baseUrl,
          internalApiKey: this.internalApiKey,
        };

        this.logger.info(
          { tenantId: tenant.id, workflowName },
          "Triggering provisioning workflow",
        );

        await this.executionsClient.createExecution({
          parent: workflowName,
          execution: {
            argument: JSON.stringify(executionArguments),
          },
        });
      } catch (error) {
        this.logger.error(
          { error, tenantId: tenant.id },
          "Failed to trigger provisioning workflow",
        );
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

  // --- Granular Provisioning Methods ---

  async provisionDatabase(tenantId: string): Promise<{ databaseUrl: string }> {
    if (!this.neonProvider) {
      throw new Error("Neon provider not initialized");
    }
    this.logger.info({ tenantId }, "Provisioning database");
    const databaseUrl = await this.neonProvider.createTenantDatabase(tenantId);
    await this.repository.update(tenantId, { databaseUrl });
    return { databaseUrl };
  }

  async triggerMigration(tenantId: string): Promise<{ executionName: string }> {
    const { tenant, databaseUrl, upstashRedisUrl } =
      await this.validateProvisioningPrerequisites(tenantId);

    const redisPrefix = `t_${tenant.redisHash}:`;

    const environmentVariables = {
      DATABASE_URL: databaseUrl,
      REDIS_URL: upstashRedisUrl,
      REDIS_PREFIX: redisPrefix,
      NODE_ENV: "production",
    };

    this.logger.info({ tenantId }, "Triggering migration job");
    const executionName = await this.cloudRunProvider!.runTenantMigrations(
      tenantId,
      environmentVariables,
    );

    return { executionName };
  }

  async getMigrationStatus(executionName: string): Promise<{
    status: MigrationStatus;
    error?: string;
  }> {
    if (!this.cloudRunProvider) {
      throw new Error("Cloud Run provider not initialized");
    }
    return this.cloudRunProvider.getJobExecutionStatus(executionName);
  }

  // Legacy/Blocking method - kept if needed by other paths, but replaced by triggerMigration in workflow
  async runMigrations(tenantId: string): Promise<void> {
    // This is now effectively just triggering and not waiting?
    // Or we keep it as is?
    // The previous implementation waited.
    // If we change runTenantMigrations to be non-blocking, this method becomes non-blocking too.
    // But `runTenantMigrations` in CloudRunProvider WAS changed to non-blocking and returns executionName.
    // So this wrapper needs to be updated or removed if unused.
    // The new controller uses triggerMigration.
    // I will deprecate this or make it just trigger.
    await this.triggerMigration(tenantId);
  }

  async deployService(tenantId: string): Promise<void> {
    const { tenant, databaseUrl, upstashRedisUrl } =
      await this.validateProvisioningPrerequisites(
        tenantId,
        true, // requireSubdomain
      );

    const redisPrefix = `t_${tenant.redisHash}:`;
    const cookieSecret = randomBytes(32).toString("hex");
    const jwtSecret = randomBytes(32).toString("hex");

    const environmentVariables = {
      DATABASE_URL: databaseUrl,
      REDIS_URL: upstashRedisUrl,
      REDIS_PREFIX: redisPrefix,
      COOKIE_SECRET: cookieSecret,
      JWT_SECRET: jwtSecret,
      HOST: "0.0.0.0",
      NODE_ENV: "production",
      STORE_CORS: `https://${tenant.subdomain}.vendin.store,http://localhost:9000,https://vendin.store`,
      ADMIN_CORS: `https://${tenant.subdomain}.vendin.store,http://localhost:9000,https://vendin.store`,
    };

    this.logger.info({ tenantId }, "Deploying service");
    const apiUrl = await this.cloudRunProvider!.deployTenantInstance(
      tenantId,
      environmentVariables,
    );

    await this.repository.update(tenantId, { apiUrl });
  }

  async configureDomain(tenantId: string): Promise<void> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant.subdomain) throw new Error("Subdomain missing");
    // Placeholder for domain configuration logic
    this.logger.info(
      { tenantId, subdomain: tenant.subdomain },
      "Configuring domain (placeholder)",
    );
  }

  async activateTenant(tenantId: string): Promise<void> {
    this.logger.info({ tenantId }, "Activating tenant");
    await this.repository.update(tenantId, { status: "active" });
  }

  async rollbackResources(tenantId: string): Promise<void> {
    this.logger.info({ tenantId }, "Rolling back resources");
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
      }
    }

    await this.repository.update(tenantId, {
      status: "provisioning_failed",
      failureReason: "Provisioning workflow failed and rolled back",
    });
  }

  // --- Helper Methods ---

  private async validateProvisioningPrerequisites(
    tenantId: string,
    requireSubdomain = false,
  ): Promise<{
    tenant: Tenant;
    databaseUrl: string;
    upstashRedisUrl: string;
  }> {
    if (!this.cloudRunProvider) {
      throw new Error("Cloud Run provider not initialized");
    }
    const tenant = await this.getTenant(tenantId);
    if (!tenant.databaseUrl) throw new Error("Database URL missing");
    if (!tenant.redisHash) throw new Error("Redis hash missing");
    if (!this.upstashRedisUrl) throw new Error("Upstash Redis URL missing");
    if (requireSubdomain && !tenant.subdomain) {
      throw new Error("Subdomain missing");
    }
    return {
      tenant,
      databaseUrl: tenant.databaseUrl,
      upstashRedisUrl: this.upstashRedisUrl,
    };
  }

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

  async listTenants(): Promise<Tenant[]> {
    const tenants = await this.repository.findAll();
    return tenants;
  }
}
