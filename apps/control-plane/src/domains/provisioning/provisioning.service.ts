import { CloudflareProvider } from "../../providers/cloudflare/cloudflare.client";
import {
  CloudRunProvider,
  type MigrationStatus,
} from "../../providers/gcp/cloud-run.client";
import { GcpWorkflowsClient } from "../../providers/gcp/workflows.client";
import { NeonProvider } from "../../providers/neon/neon.client";
import { type Logger } from "../../utils/logger";
import { type TenantRepository } from "../tenants/tenant.repository";

import { DomainProvisioningService } from "./domain-provisioning.service";

export interface ProvisioningServiceConfig {
  neonApiKey?: string | undefined;
  neonProjectId?: string | undefined;
  gcpCredentialsJson?: string | undefined;
  gcpProjectId?: string | undefined;
  gcpRegion?: string | undefined;
  tenantImageTag?: string | undefined;
  upstashRedisUrl?: string | undefined;
  cloudRunServiceAccount?: string | undefined;
  geminiApiKey?: string | undefined;
  cloudflareApiToken?: string | undefined;
  cloudflareZoneId?: string | undefined;
  tenantBaseDomain?: string | undefined;
  storefrontHostname?: string | undefined;
  logger: Logger;
}

export class ProvisioningService {
  private neonProvider: NeonProvider | null = null;
  private cloudRunProvider: CloudRunProvider | null = null;
  private executionsClient: GcpWorkflowsClient | null = null;
  private cloudflareProvider: CloudflareProvider | null = null;
  private domainProvisioningService: DomainProvisioningService | null = null;
  private upstashRedisUrl: string | undefined;
  public readonly tenantBaseDomain: string;
  private logger: Logger;

  constructor(
    private tenantRepository: TenantRepository,
    config: ProvisioningServiceConfig,
  ) {
    this.logger = config.logger;
    this.upstashRedisUrl = config.upstashRedisUrl;
    this.tenantBaseDomain = config.tenantBaseDomain as string;

    this.initializeProviders(config);
  }

  private initializeProviders(config: ProvisioningServiceConfig): void {
    this.initializeNeonProvider(config);
    this.initializeCloudRunProvider(config);
    this.initializeWorkflowsClient(config);
    this.initializeCloudflareProvider(config);

    if (this.cloudflareProvider) {
      this.domainProvisioningService = new DomainProvisioningService({
        tenantRepository: this.tenantRepository,
        cloudflareProvider: this.cloudflareProvider,
        logger: this.logger,
        tenantBaseDomain: this.tenantBaseDomain,
        storefrontHostname: config.storefrontHostname as string,
      });
    }
  }

  private initializeNeonProvider(config: ProvisioningServiceConfig): void {
    if (config.neonApiKey && config.neonProjectId) {
      try {
        this.neonProvider = new NeonProvider({
          apiKey: config.neonApiKey,
          projectId: config.neonProjectId,
          logger: this.logger,
        });
      } catch (error) {
        this.logger.error({ error }, "Failed to initialize Neon provider");
        throw error;
      }
    } else {
      this.logger.warn(
        "Neon credentials not found. Database provisioning will be skipped.",
      );
    }
  }

  private initializeCloudRunProvider(config: ProvisioningServiceConfig): void {
    if (config.gcpProjectId && config.gcpRegion && config.tenantImageTag) {
      try {
        this.cloudRunProvider = new CloudRunProvider({
          credentialsJson: config.gcpCredentialsJson,
          projectId: config.gcpProjectId,
          region: config.gcpRegion,
          tenantImageTag: config.tenantImageTag,
          logger: this.logger,
          ...(config.geminiApiKey ? { geminiApiKey: config.geminiApiKey } : {}),
          ...(config.cloudRunServiceAccount
            ? { serviceAccount: config.cloudRunServiceAccount }
            : {}),
          tenantBaseDomain: this.tenantBaseDomain,
        });
      } catch (error) {
        this.logger.error({ error }, "Failed to initialize Cloud Run provider");
        throw error;
      }
    } else {
      this.logger.warn(
        "GCP config not found. Cloud Run deployment will be skipped.",
      );
    }
  }

  private initializeWorkflowsClient(config: ProvisioningServiceConfig): void {
    try {
      this.executionsClient = new GcpWorkflowsClient({
        credentialsJson: config.gcpCredentialsJson,
        projectId: config.gcpProjectId || "unknown-project",
        location: config.gcpRegion || "unknown-region",
        logger: this.logger,
      });
    } catch (error) {
      this.logger.error({ error }, "Failed to initialize GCP Workflows client");
      throw error;
    }
  }

  private initializeCloudflareProvider(
    config: ProvisioningServiceConfig,
  ): void {
    if (config.cloudflareApiToken && config.cloudflareZoneId) {
      try {
        this.cloudflareProvider = new CloudflareProvider({
          apiToken: config.cloudflareApiToken,
          zoneId: config.cloudflareZoneId,
          logger: this.logger,
        });
      } catch (error) {
        this.logger.error(
          { error },
          "Failed to initialize Cloudflare provider",
        );
        throw error;
      }
    } else {
      this.logger.warn(
        "Cloudflare credentials not found. Domain configuration will be skipped.",
      );
    }
  }

  async provisionDatabase(tenantId: string): Promise<{ databaseUrl: string }> {
    if (!this.neonProvider) {
      throw new Error("Neon provider not initialized");
    }
    this.logger.info({ tenantId }, "Provisioning database");
    const databaseUrl = await this.neonProvider.createTenantDatabase(tenantId);
    await this.tenantRepository.update(tenantId, { databaseUrl });
    return { databaseUrl };
  }

  async ensureMigrationJob(
    tenantId: string,
  ): Promise<{ operationName?: string }> {
    const { tenant, databaseUrl, upstashRedisUrl } =
      await this.validateProvisioningPrerequisites(tenantId);

    const redisPrefix = `t_${tenant.redisHash}:`;

    const jwtSecret = tenant.jwtSecret;
    const cookieSecret = tenant.cookieSecret;

    this.logger.info({ tenantId }, "Ensuring migration job exists");
    const operationName = await this.cloudRunProvider?.ensureMigrationJob(
      tenantId,
      {
        databaseUrl,
        redisUrl: upstashRedisUrl,
        redisPrefix,
        jwtSecret,
        cookieSecret,
      },
    );

    // Returns operationName if a long-running operation was initiated.
    // Returns empty object if the job already exists or no changes were needed (synchronous completion).
    return operationName ? { operationName } : {};
  }

  async triggerMigrationJob(
    tenantId: string,
  ): Promise<{ operationName: string }> {
    const { cloudRunProvider } = await this.validateProvisioningPrerequisites(
      tenantId,
      false, // requireSubdomain
    );

    this.logger.info({ tenantId }, "Triggering migration job execution");
    const operationName = await cloudRunProvider.triggerMigrationJob(tenantId);

    return { operationName };
  }

  getMigrationStatus(executionName: string): Promise<{
    status: MigrationStatus;
    error?: string;
  }> {
    if (!this.cloudRunProvider) {
      throw new Error("Cloud Run provider not initialized");
    }
    return this.cloudRunProvider.getJobExecutionStatus(executionName);
  }

  async deleteMigrationJob(tenantId: string): Promise<void> {
    if (!this.cloudRunProvider) {
      throw new Error("Cloud Run provider not initialized");
    }
    await this.cloudRunProvider.deleteMigrationJob(tenantId);
  }

  async getOperationStatus(
    operationName: string,
  ): Promise<{ done: boolean; error?: string; response?: unknown }> {
    if (!this.cloudRunProvider) {
      throw new Error("Cloud Run provider not initialized");
    }
    const result = await this.cloudRunProvider.getOperation(operationName);
    return result;
  }

  async startDeployService(
    tenantId: string,
  ): Promise<{ operationName: string }> {
    const { tenant, databaseUrl, upstashRedisUrl } =
      await this.validateProvisioningPrerequisites(
        tenantId,
        true, // requireSubdomain
      );

    const redisPrefix = `t_${tenant.redisHash}:`;

    const jwtSecret = tenant.jwtSecret;
    const cookieSecret = tenant.cookieSecret;

    this.logger.info({ tenantId }, "Starting service deployment operation");
    const operationName =
      (await this.cloudRunProvider?.startDeployTenantInstance(tenantId, {
        databaseUrl,
        redisUrl: upstashRedisUrl,
        redisPrefix,
        subdomain: tenant.subdomain!,
        jwtSecret,
        cookieSecret,
      })) ?? "";

    return { operationName };
  }

  async finalizeDeployment(tenantId: string): Promise<{ apiUrl: string }> {
    const { cloudRunProvider } = await this.validateProvisioningPrerequisites(
      tenantId,
      true, // requireSubdomain
    );

    this.logger.info({ tenantId }, "Finalizing deployment");
    const apiUrl = await cloudRunProvider.finalizeTenantService(tenantId);

    await this.tenantRepository.update(tenantId, { apiUrl });
    return { apiUrl };
  }

  async configureDomain(tenantId: string): Promise<void> {
    if (!this.domainProvisioningService) {
      this.logger.warn(
        { tenantId },
        "Domain provisioning service not initialized, skipping domain configuration",
      );
      return;
    }

    await this.domainProvisioningService.configureDomain(tenantId);
  }

  async triggerProvisioningWorkflow(
    tenantId: string,
    baseUrl: string,
  ): Promise<void> {
    if (!this.executionsClient) {
      throw new Error("GCP Workflows client not initialized");
    }

    await this.tenantRepository.logProvisioningEvent(
      tenantId,
      "trigger_workflow",
      "started",
    );

    try {
      await this.executionsClient.triggerProvisionTenant({
        tenantId,
        baseUrl,
      });

      await this.tenantRepository.logProvisioningEvent(
        tenantId,
        "trigger_workflow",
        "completed",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.logger.error(
        { error, tenantId },
        "Failed to trigger provisioning workflow",
      );

      await this.tenantRepository.update(tenantId, {
        status: "provisioning_failed",
        failureReason: errorMessage,
      });

      await this.tenantRepository.logProvisioningEvent(
        tenantId,
        "trigger_workflow",
        "failed",
        { error: errorMessage },
      );

      throw error;
    }
  }

  async activateTenant(tenantId: string): Promise<void> {
    this.logger.info({ tenantId }, "Activating tenant");
    await this.tenantRepository.update(tenantId, { status: "active" });
  }

  async rollbackResources(
    tenantId: string,
    reason?: string,
  ): Promise<{ operationName?: string }> {
    this.logger.info({ tenantId, reason }, "Rolling back resources");
    let operationName: string | undefined;

    if (this.neonProvider && this.cloudRunProvider) {
      const deleteDatabasePromise =
        this.neonProvider.deleteTenantDatabase(tenantId);
      const deleteInstancePromise =
        this.cloudRunProvider.deleteTenantInstance(tenantId);

      const results = await Promise.allSettled([
        deleteDatabasePromise,
        deleteInstancePromise,
      ]);

      const instanceResult = results[1];
      if (instanceResult.status === "fulfilled") {
        operationName = instanceResult.value;
      }

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

    await this.tenantRepository.update(tenantId, {
      status: "provisioning_failed",
      failureReason: reason || "Provisioning workflow failed and rolled back",
    });

    return operationName ? { operationName } : {};
  }

  // --- Helper Methods ---

  private async validateProvisioningPrerequisites(
    tenantId: string,
    requireSubdomain = false,
  ) {
    if (!this.cloudRunProvider) {
      throw new Error("Cloud Run provider not initialized");
    }
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new Error("Tenant not found");
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
      cloudRunProvider: this.cloudRunProvider,
    };
  }
}
