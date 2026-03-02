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

/**
 * Configuration options for the ProvisioningService.
 */
export interface ProvisioningServiceConfig {
  neonApiKey?: string | undefined;
  neonOrgId?: string | undefined;
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

/**
 * Service responsible for orchestrating the provisioning of tenant resources.
 * This includes database creation (Neon), service deployment (Cloud Run),
 * and domain configuration (Cloudflare).
 */
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
    if (config.neonApiKey) {
      try {
        this.neonProvider = new NeonProvider({
          apiKey: config.neonApiKey,
          ...(config.neonOrgId ? { orgId: config.neonOrgId } : {}),
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

  /**
   * Provisions a dedicated database project for a tenant using Neon.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @returns An object containing the connection string for the new database.
   * @throws If the Neon provider is not initialized, or if database provisioning or updating the tenant record fails.
   */
  async provisionDatabase(tenantId: string): Promise<{ databaseUrl: string }> {
    if (!this.neonProvider) {
      throw new Error("Neon provider not initialized");
    }
    this.logger.info(
      { tenantId },
      "Provisioning database (Project-per-Tenant)",
    );

    const { connectionString, projectId } =
      await this.neonProvider.createTenantProject(tenantId);

    await this.tenantRepository.update(tenantId, {
      databaseUrl: connectionString,
      neonProjectId: projectId,
    });

    return { databaseUrl: connectionString };
  }

  /**
   * Creates a point-in-time snapshot of the tenant's database.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @param snapshotName - The name to assign to the new snapshot.
   * @returns An object containing the ID of the created snapshot.
   * @throws If the Neon provider is not initialized, the tenant has no project ID, or snapshot creation fails.
   */
  async createDatabaseSnapshot(
    tenantId: string,
    snapshotName: string,
  ): Promise<{ snapshotId: string }> {
    if (!this.neonProvider) {
      throw new Error("Neon provider not initialized");
    }

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant?.neonProjectId) {
      throw new Error("Tenant does not have a Neon Project ID");
    }

    this.logger.info({ tenantId, snapshotName }, "Creating database snapshot");
    const snapshotId = await this.neonProvider.createSnapshot(
      tenant.neonProjectId,
      snapshotName,
    );

    return { snapshotId };
  }

  /**
   * Restores a tenant's database from a previously created snapshot.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @param snapshotName - The name of the snapshot to restore from.
   * @throws If the Neon provider is not initialized, the tenant has no project ID, or snapshot restoration fails.
   */
  async restoreDatabaseSnapshot(
    tenantId: string,
    snapshotName: string,
  ): Promise<void> {
    if (!this.neonProvider) {
      throw new Error("Neon provider not initialized");
    }

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant?.neonProjectId) {
      throw new Error("Tenant does not have a Neon Project ID");
    }

    this.logger.info({ tenantId, snapshotName }, "Restoring database snapshot");
    await this.neonProvider.restoreFromSnapshot(
      tenant.neonProjectId,
      snapshotName,
    );
  }

  /**
   * Ensures that a Cloud Run job exists for executing database migrations for the tenant.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @param imageTag - Optional override for the container image tag to use.
   * @returns An object containing the Google Cloud operation name, if an operation was started.
   * @throws If required provisioning prerequisites are missing or if ensuring the migration job fails.
   */
  async ensureMigrationJob(
    tenantId: string,
    imageTag?: string,
  ): Promise<{ operationName?: string }> {
    const { tenant, databaseUrl, upstashRedisUrl } =
      await this.validateProvisioningPrerequisites(tenantId);

    const redisPrefix = `t_${tenant.redisHash}:`;

    const jwtSecret = tenant.jwtSecret;
    const cookieSecret = tenant.cookieSecret;

    this.logger.info({ tenantId, imageTag }, "Ensuring migration job exists");
    const operationName = await this.cloudRunProvider?.ensureMigrationJob(
      tenantId,
      {
        databaseUrl,
        redisUrl: upstashRedisUrl,
        redisPrefix,
        jwtSecret,
        cookieSecret,
      },
      imageTag,
    );

    return operationName ? { operationName } : {};
  }

  /**
   * Triggers the execution of the tenant's database migration job.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @returns An object containing the Google Cloud operation name for the job execution.
   * @throws If required provisioning prerequisites are missing or if triggering the migration job fails.
   */
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

  /**
   * Retrieves the current status of a database migration job execution.
   *
   * @param executionName - The full resource name of the job execution.
   * @returns A promise that resolves to the status and any associated error message.
   * @throws If the Cloud Run provider is not initialized or if fetching the job status fails.
   */
  getMigrationStatus(executionName: string): Promise<{
    status: MigrationStatus;
    error?: string;
  }> {
    if (!this.cloudRunProvider) {
      throw new Error("Cloud Run provider not initialized");
    }
    return this.cloudRunProvider.getJobExecutionStatus(executionName);
  }

  /**
   * Deletes the Cloud Run job used for database migrations for the specified tenant.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @throws If the Cloud Run provider is not initialized or if deleting the migration job fails.
   */
  async deleteMigrationJob(tenantId: string): Promise<void> {
    if (!this.cloudRunProvider) {
      throw new Error("Cloud Run provider not initialized");
    }
    await this.cloudRunProvider.deleteMigrationJob(tenantId);
  }

  /**
   * Retrieves the status of a long-running Google Cloud operation.
   *
   * @param operationName - The full resource name of the operation.
   * @returns An object indicating whether the operation is done, along with any error or response data.
   * @throws If the Cloud Run provider is not initialized or if fetching the operation status fails.
   */
  async getOperationStatus(
    operationName: string,
  ): Promise<{ done: boolean; error?: string; response?: unknown }> {
    if (!this.cloudRunProvider) {
      throw new Error("Cloud Run provider not initialized");
    }
    const result = await this.cloudRunProvider.getOperation(operationName);
    return result;
  }

  /**
   * Initiates the deployment of the tenant's main service (Medusa instance) to Cloud Run.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @param imageTag - Optional override for the container image tag to deploy.
   * @returns An object containing the Google Cloud operation name for the deployment.
   * @throws If required provisioning prerequisites are missing, the subdomain is not set, or if starting the service deployment fails.
   */
  async startDeployService(
    tenantId: string,
    imageTag?: string,
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
      (await this.cloudRunProvider?.startDeployTenantInstance(
        tenantId,
        {
          databaseUrl,
          redisUrl: upstashRedisUrl,
          redisPrefix,
          subdomain: tenant.subdomain!,
          jwtSecret,
          cookieSecret,
        },
        imageTag,
      )) ?? "";

    return { operationName };
  }

  /**
   * Finalizes the deployment process by retrieving the final service URL and updating the tenant record.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @returns An object containing the final API URL for the deployed service.
   * @throws If required provisioning prerequisites are missing or if finalizing the deployment fails.
   */
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

  /**
   * Configures the custom or default domain routing for the tenant using Cloudflare.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @throws If domain configuration fails.
   */
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

  /**
   * Triggers the GCP Workflow orchestrating the end-to-end provisioning process for a tenant.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @param baseUrl - The base URL of the control plane API, used by the workflow for callbacks.
   * @throws If the GCP Workflows client is not initialized or the workflow trigger fails.
   */
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

  /**
   * Marks a tenant as active after successful provisioning.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @throws If updating the tenant status fails.
   */
  async activateTenant(tenantId: string): Promise<void> {
    this.logger.info({ tenantId }, "Activating tenant");
    await this.tenantRepository.update(tenantId, { status: "active" });
  }

  /**
   * Attempts to clean up and roll back provisioned resources for a tenant upon failure.
   * This includes deleting the Neon database project and the Cloud Run instance.
   *
   * @param tenantId - The unique identifier of the tenant.
   * @param reason - An optional reason describing why the rollback was initiated.
   * @returns An object containing the Google Cloud operation name for the instance deletion, if applicable.
   * @throws If fetching the tenant or updating the tenant status fails.
   */
  async rollbackResources(
    tenantId: string,
    reason?: string,
  ): Promise<{ operationName?: string }> {
    this.logger.info({ tenantId, reason }, "Rolling back resources");
    let operationName: string | undefined;

    // Fetch tenant to get project ID
    const tenant = await this.tenantRepository.findById(tenantId);

    if (this.neonProvider && this.cloudRunProvider) {
      let deleteDatabasePromise: Promise<void> | undefined;

      if (tenant?.neonProjectId) {
        deleteDatabasePromise = this.neonProvider.deleteTenantProject(
          tenant.neonProjectId,
        );
      } else {
        this.logger.warn(
          { tenantId },
          "No Neon Project ID found during rollback, skipping DB deletion",
        );
        deleteDatabasePromise = Promise.resolve();
      }

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
