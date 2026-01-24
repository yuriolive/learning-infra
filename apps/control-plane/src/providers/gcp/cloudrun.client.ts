import { randomBytes } from "node:crypto";

import { ServicesClient } from "@google-cloud/run";
import { createLogger } from "@vendin/utils/logger";

const logger = createLogger({
  logLevel: process.env.LOG_LEVEL,
  nodeEnv: process.env.NODE_ENV ?? "development",
});

export class CloudRunProvider {
  private client: ServicesClient;
  private projectId: string;
  private region: string;
  private serviceAccount: string;

  constructor() {
    this.client = new ServicesClient();

    const projectId = process.env.GCP_PROJECT_ID;
    if (!projectId) {
      throw new Error("GCP_PROJECT_ID environment variable is not set");
    }
    this.projectId = projectId;

    this.region = process.env.GCP_REGION ?? "southamerica-east1";

    const serviceAccount = process.env.GCP_TENANT_SERVICE_ACCOUNT;
    if (!serviceAccount) {
      throw new Error(
        "GCP_TENANT_SERVICE_ACCOUNT environment variable is not set",
      );
    }
    this.serviceAccount = serviceAccount;
  }

  async provisionTenantService(
    tenantId: string,
    databaseUrl: string,
    image?: string,
  ): Promise<string> {
    const serviceId = `tenant-${tenantId}`;
    const parent = `projects/${this.projectId}/locations/${this.region}`;

    logger.info(
      { tenantId, serviceId, parent },
      "Provisioning Cloud Run service for tenant",
    );

    const cookieSecret = randomBytes(32).toString("hex");
    const jwtSecret = randomBytes(32).toString("hex");

    const request = {
      parent,
      serviceId,
      service: {
        template: {
          serviceAccount: this.serviceAccount,
          scaling: {
            minInstanceCount: 0,
          },
          containers: [
            {
              image: image ?? "medusajs/medusa:latest",
              resources: {
                limits: {
                  cpu: "1000m",
                  memory: "1024Mi",
                },
              },
              env: [
                {
                  name: "DATABASE_URL",
                  value: databaseUrl,
                },
                {
                  name: "NODE_ENV",
                  value: "production",
                },
                {
                  name: "COOKIE_SECRET",
                  value: cookieSecret,
                },
                {
                  name: "JWT_SECRET",
                  value: jwtSecret,
                },
              ],
            },
          ],
        },
      },
    };

    try {
      const [operation] = await this.client.createService(request);

      logger.info(
        { tenantId, operationName: operation.name },
        "Cloud Run service creation initiated",
      );

      const [response] = await operation.promise();

      if (!response.uri) {
        throw new Error("Cloud Run service created but URL is missing");
      }

      logger.info(
        { tenantId, url: response.uri },
        "Cloud Run service provisioned successfully",
      );

      return response.uri;
    } catch (error) {
      logger.error(
        { error, tenantId },
        "Failed to provision Cloud Run service",
      );
      throw error;
    }
  }
}
