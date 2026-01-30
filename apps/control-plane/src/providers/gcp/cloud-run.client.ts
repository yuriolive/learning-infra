import { type createLogger } from "@vendin/utils/logger";
import { GoogleAuth } from "google-auth-library";
import { run_v2 } from "googleapis";

interface CloudRunProviderConfig {
  credentialsJson?: string | undefined;
  projectId: string;
  region: string;
  tenantImageTag: string;
  serviceAccount?: string;
  logger: ReturnType<typeof createLogger>;
}

export class CloudRunProvider {
  private runClient: run_v2.Run;
  private logger: ReturnType<typeof createLogger>;
  private projectId: string;
  private region: string;
  private tenantImageTag: string;
  private serviceAccount: string | undefined;

  constructor(config: CloudRunProviderConfig) {
    this.logger = config.logger;
    this.projectId = config.projectId;
    this.region = config.region;
    this.tenantImageTag = config.tenantImageTag;
    this.serviceAccount = config.serviceAccount;

    const authOptions: {
      credentials?: object;
      keyFilename?: string;
      scopes: string[];
    } = {
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    };

    if (config.credentialsJson) {
      try {
        // Try parsing as JSON string validation
        const credentials = JSON.parse(config.credentialsJson);
        authOptions.credentials = credentials;
      } catch {
        // If not valid JSON, treat as file path
        authOptions.keyFilename = config.credentialsJson;
      }
    }

    const auth = new GoogleAuth(authOptions);

    this.runClient = new run_v2.Run({ auth });
  }

  async deployTenantInstance(
    tenantId: string,
    environmentVariables: Record<string, string>,
  ): Promise<string> {
    const serviceName = `tenant-${tenantId}`;
    const parent = `projects/${this.projectId}/locations/${this.region}`;
    const servicePath = `${parent}/services/${serviceName}`;

    this.logger.info({ tenantId }, "Starting Cloud Run deployment");

    const serviceRequest = this.prepareServiceRequest(environmentVariables);

    let operationName: string | undefined;

    try {
      operationName = await this.getOrCreateService(
        serviceName,
        servicePath,
        parent,
        serviceRequest,
        tenantId,
      );

      if (!operationName) {
        throw new Error(
          "Failed to start deployment operation (no operation name returned)",
        );
      }

      // Wait for operation completion
      await this.waitForOperation(operationName);

      // Make service public (idempotent)
      await this.makeServicePublic(servicePath);

      // Fetch the final service to get the URL
      const service = await this.runClient.projects.locations.services.get({
        name: servicePath,
      });

      const uri = service.data.uri;
      if (!uri) {
        throw new Error("Service deployed but URI is missing");
      }

      this.logger.info({ tenantId, uri }, "Cloud Run deployment successful");
      return uri;
    } catch (error) {
      this.logger.error({ error, tenantId }, "Cloud Run deployment failed");
      throw error;
    }
  }

  async runTenantMigrations(
    tenantId: string,
    environmentVariables: Record<string, string>,
  ): Promise<void> {
    const jobId = `migrate-${tenantId}`;
    const parent = `projects/${this.projectId}/locations/${this.region}`;
    const jobPath = `${parent}/jobs/${jobId}`;

    this.logger.info({ tenantId }, "Starting database migrations job");

    const jobRequest = this.prepareJobRequest(environmentVariables);

    try {
      const operationName = await this.getOrCreateJob(
        jobId,
        jobPath,
        parent,
        jobRequest,
        tenantId,
      );

      if (operationName) {
        await this.waitForOperation(operationName);
      }

      // Run the job
      const executionOperation = await this.runJobExecution(jobPath, tenantId);

      if (!executionOperation) {
        throw new Error("Failed to start migration job execution");
      }

      // Wait for execution to complete
      await this.waitForExecutionCompletion(executionOperation);

      this.logger.info(
        { tenantId },
        "Database migrations completed successfully",
      );
    } catch (error) {
      this.logger.error({ error, tenantId }, "Database migrations failed");
      throw error;
    }
  }

  async deleteTenantInstance(tenantId: string): Promise<void> {
    const serviceName = `tenant-${tenantId}`;
    const parent = `projects/${this.projectId}/locations/${this.region}`;
    const servicePath = `${parent}/services/${serviceName}`;

    this.logger.info({ tenantId }, "Deleting Cloud Run service");

    try {
      const operation = await this.runClient.projects.locations.services.delete(
        {
          name: servicePath,
        },
      );

      if (operation.data.name) {
        await this.waitForOperation(operation.data.name);
      }

      this.logger.info({ tenantId }, "Deleted Cloud Run service");
    } catch (error: unknown) {
      // Ignore if not found
      if (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: number }).code === 404
      ) {
        this.logger.info(
          { tenantId },
          "Cloud Run service not found, skipping delete",
        );
      } else {
        this.logger.warn(
          { error, tenantId },
          "Failed to delete Cloud Run service",
        );
      }
    }
  }

  private async waitForOperation(operationName: string): Promise<void> {
    const startTime = Date.now();
    const timeout = 300_000; // 5 minutes

    this.logger.info({ operationName }, "Waiting for Cloud Run operation");

    while (Date.now() - startTime < timeout) {
      const response = await this.runClient.projects.locations.operations.get({
        name: operationName,
      });

      if (response.data.done) {
        if (response.data.error) {
          throw new Error(
            response.data.error.message ||
              "Operation failed with unknown error",
          );
        }
        return;
      }

      // Wait 2 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error("Timeout waiting for Cloud Run operation");
  }

  private async makeServicePublic(servicePath: string): Promise<void> {
    this.logger.info(
      { servicePath },
      "Setting IAM policy to allow public access",
    );

    const policyResponse =
      await this.runClient.projects.locations.services.getIamPolicy({
        resource: servicePath,
      });

    const policy = policyResponse.data;
    policy.bindings = policy.bindings || [];

    const publicBinding = policy.bindings.find(
      (b: { role?: string | null; members?: string[] | null }) =>
        b.role === "roles/run.invoker",
    );
    if (publicBinding) {
      if (publicBinding.members?.includes("allUsers")) {
        // Already public
        return;
      } else {
        publicBinding.members = [...(publicBinding.members || []), "allUsers"];
      }
    } else {
      policy.bindings.push({
        role: "roles/run.invoker",
        members: ["allUsers"],
      });
    }

    await this.runClient.projects.locations.services.setIamPolicy({
      resource: servicePath,
      requestBody: { policy },
    });
  }

  private getOrCreateService(
    serviceId: string,
    servicePath: string,
    parent: string,
    serviceRequest: run_v2.Schema$GoogleCloudRunV2Service,
    tenantId: string,
  ): Promise<string | undefined> {
    return this.getOrCreateResource(
      serviceId,
      servicePath,
      parent,
      serviceRequest,
      "services",
      tenantId,
    );
  }

  private getOrCreateJob(
    jobId: string,
    jobPath: string,
    parent: string,
    jobRequest: run_v2.Schema$GoogleCloudRunV2Job,
    tenantId: string,
  ): Promise<string | undefined> {
    return this.getOrCreateResource(
      jobId,
      jobPath,
      parent,
      jobRequest,
      "jobs",
      tenantId,
    );
  }

  private async checkResourceExists(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any,
    resourcePath: string,
  ): Promise<boolean> {
    try {
      await client.get({
        name: resourcePath,
      });
      return true;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: number }).code !== 404
      ) {
        throw error;
      }
      return false;
    }
  }

  private async getOrCreateResource(
    resourceId: string,
    resourcePath: string,
    parent: string,
    requestBody: object,
    resourceType: "services" | "jobs",
    tenantId: string,
  ): Promise<string | undefined> {
    const client =
      resourceType === "services"
        ? this.runClient.projects.locations.services
        : this.runClient.projects.locations.jobs;
    const idField = resourceType === "services" ? "serviceId" : "jobId";
    const displayName = resourceType === "services" ? "service" : "job";

    const exists = await this.checkResourceExists(client, resourcePath);

    if (exists) {
      this.logger.info(
        { tenantId },
        `Updating existing Cloud Run ${displayName}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (client as any).patch({
        name: resourcePath,
        requestBody,
      });
      return response.data.name ?? undefined;
    }

    this.logger.info({ tenantId }, `Creating new Cloud Run ${displayName}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client as any).create({
      parent,
      [idField]: resourceId,
      requestBody,
    });
    return response.data.name ?? undefined;
  }

  private async runJobExecution(
    jobPath: string,
    tenantId: string,
  ): Promise<string | undefined> {
    this.logger.info({ tenantId }, "Executing Cloud Run migration job");
    const response = await this.runClient.projects.locations.jobs.run({
      name: jobPath,
    });
    return response.data.name ?? undefined;
  }

  private async waitForExecutionCompletion(
    executionOperationName: string,
  ): Promise<void> {
    const startTime = Date.now();
    const timeout = 600_000; // 10 minutes for migrations

    this.logger.info(
      { executionOperationName },
      "Waiting for Cloud Run job execution completion",
    );

    // Initial wait to let the operation settle
    await new Promise((resolve) => setTimeout(resolve, 5000));

    while (Date.now() - startTime < timeout) {
      const response = await this.runClient.projects.locations.operations.get({
        name: executionOperationName,
      });

      if (response.data.done) {
        if (response.data.error) {
          throw new Error(
            `Migration job failed: ${response.data.error.message}`,
          );
        }

        // The operation being "done" means the execution was triggered.
        // We need to fetch the execution itself to check its status.
        const executionName = response.data.response?.name as string;
        if (!executionName) {
          throw new Error(
            "Job execution started but execution name is missing",
          );
        }

        return this.pollExecutionStatus(executionName);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error("Timeout waiting for migration job to start");
  }

  private async pollExecutionStatus(executionName: string): Promise<void> {
    const startTime = Date.now();
    const timeout = 600_000; // 10 minutes

    while (Date.now() - startTime < timeout) {
      const response =
        await this.runClient.projects.locations.jobs.executions.get({
          name: executionName,
        });

      const execution = response.data;

      // Check for completion conditions
      if (execution.succeededCount === 1) {
        return;
      }

      if (execution.failedCount && execution.failedCount > 0) {
        throw new Error(`Migration job execution failed`);
      }

      if (execution.cancelledCount && execution.cancelledCount > 0) {
        throw new Error(`Migration job execution was cancelled`);
      }

      // Check if it's still running
      this.logger.debug({ executionName }, "Polling migration job status...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error("Timeout waiting for migration job execution results");
  }

  private prepareJobRequest(
    environmentVariables: Record<string, string>,
  ): run_v2.Schema$GoogleCloudRunV2Job {
    return {
      template: {
        template: {
          containers: [
            {
              image: this.tenantImageTag,
              command: ["pnpm", "run", "db:migrate"],
              env: Object.entries(environmentVariables).map(
                ([name, value]) => ({
                  name,
                  value,
                }),
              ),
              resources: {
                limits: {
                  memory: "1024Mi",
                  cpu: "1",
                },
              },
            },
          ],
          serviceAccount: this.serviceAccount ?? null,
        },
      },
    };
  }

  private prepareServiceRequest(
    environmentVariables: Record<string, string>,
  ): run_v2.Schema$GoogleCloudRunV2Service {
    const container = {
      image: this.tenantImageTag,
      env: Object.entries(environmentVariables).map(([name, value]) => ({
        name,
        value,
      })),
      ports: [
        {
          containerPort: 9000,
        },
      ],
      startupProbe: {
        httpGet: {
          path: "/health",
          port: 9000,
        },
        initialDelaySeconds: 10,
        timeoutSeconds: 3,
        failureThreshold: 24,
        periodSeconds: 10,
      },
      livenessProbe: {
        httpGet: {
          path: "/health",
          port: 9000,
        },
        initialDelaySeconds: 30,
        timeoutSeconds: 5,
        failureThreshold: 3,
        periodSeconds: 15,
      },
      resources: {
        limits: {
          memory: "512Mi",
          cpu: "1",
        },
        cpuIdle: true,
      },
    };

    return {
      template: {
        serviceAccount: this.serviceAccount ?? null,
        containers: [container],
        scaling: {
          minInstanceCount: 0,
          maxInstanceCount: 3,
        },
      },
    };
  }
}
