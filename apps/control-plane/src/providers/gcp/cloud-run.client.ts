import { type createLogger } from "@vendin/utils/logger";
import { GoogleAuth } from "google-auth-library";
import { run_v2 } from "googleapis";

interface CloudRunProviderConfig {
  credentialsJson: string;
  projectId: string;
  region: string;
  tenantImageTag: string;
  logger: ReturnType<typeof createLogger>;
}

export class CloudRunProvider {
  private runClient: run_v2.Run;
  private logger: ReturnType<typeof createLogger>;
  private projectId: string;
  private region: string;
  private tenantImageTag: string;

  constructor(config: CloudRunProviderConfig) {
    this.logger = config.logger;
    this.projectId = config.projectId;
    this.region = config.region;
    this.tenantImageTag = config.tenantImageTag;

    const auth = new GoogleAuth({
      credentials: JSON.parse(config.credentialsJson),
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

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
        (error as { code?: number }).code !== 404
      ) {
        this.logger.warn(
          { error, tenantId },
          "Failed to delete Cloud Run service",
        );
      } else {
        this.logger.info(
          { tenantId },
          "Cloud Run service not found, skipping delete",
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

  private async getOrCreateService(
    serviceId: string,
    servicePath: string,
    parent: string,
    serviceRequest: run_v2.Schema$GoogleCloudRunV2Service,
    tenantId: string,
  ): Promise<string | undefined> {
    // Try to get service to decide between create or patch
    let exists = false;
    try {
      await this.runClient.projects.locations.services.get({
        name: servicePath,
      });
      exists = true;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: number }).code !== 404
      ) {
        throw error;
      }
    }

    if (exists) {
      this.logger.info({ tenantId }, "Updating existing Cloud Run service");
      const response = await this.runClient.projects.locations.services.patch({
        name: servicePath,
        requestBody: serviceRequest,
      });
      return response.data.name ?? undefined;
    }

    this.logger.info({ tenantId }, "Creating new Cloud Run service");
    const response = await this.runClient.projects.locations.services.create({
      parent,
      serviceId,
      requestBody: serviceRequest,
    });
    return response.data.name ?? undefined;
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
      resources: {
        limits: {
          memory: "512Mi",
          cpu: "1",
        },
      },
    };

    return {
      template: {
        containers: [container],
        scaling: {
          minInstanceCount: 0,
          maxInstanceCount: 3,
        },
      },
    };
  }
}
