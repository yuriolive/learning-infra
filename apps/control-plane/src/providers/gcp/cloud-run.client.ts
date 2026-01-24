import { google } from "googleapis";
import { createLogger } from "@vendin/utils/logger";
import crypto from "crypto";

const logger = createLogger({
  logLevel: process.env.LOG_LEVEL,
  nodeEnv: process.env.NODE_ENV ?? "development",
});

export class CloudRunProvider {
  private runClient;
  private projectId: string;
  private region: string;
  private serviceAccount: string;
  private image: string;

  constructor() {
    this.runClient = google.run("v2");
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || "vendin-store";
    this.region = process.env.GOOGLE_CLOUD_REGION || "southamerica-east1";
    this.serviceAccount =
      process.env.CLOUD_RUN_SERVICE_ACCOUNT ||
      "cloud-run-sa@vendin-store.iam.gserviceaccount.com";
    this.image =
      process.env.TENANT_INSTANCE_IMAGE ||
      "southamerica-east1-docker.pkg.dev/vendin-store/containers/tenant-instance:latest";
  }

  /**
   * Deploys a Cloud Run service for a tenant.
   * @param tenantId - The unique identifier of the tenant.
   * @param databaseUrlSecretVersion - The resource name of the secret version containing the database URL.
   *                                   Format: projects/{project}/secrets/{secret}/versions/{version}
   * @returns The URL of the deployed service.
   */
  async deployTenantService(
    tenantId: string,
    databaseUrlSecretVersion: string
  ): Promise<string> {
    logger.info({ tenantId }, "Deploying Cloud Run service for tenant");

    const serviceName = `tenant-${tenantId}`;
    const parent = `projects/${this.projectId}/locations/${this.region}`;

    const r2Secrets = [
      { name: "S3_ACCESS_KEY_ID", secret: "r2-access-key-id" },
      { name: "S3_SECRET_ACCESS_KEY", secret: "r2-secret-access-key" },
      { name: "S3_BUCKET", secret: "r2-bucket-name" },
      { name: "S3_ENDPOINT", secret: "r2-endpoint" },
      { name: "S3_FILE_URL", secret: "r2-public-url" },
    ];

    // Environment variables
    const envVars = [
      { name: "NODE_ENV", value: "production" },
      { name: "TENANT_ID", value: tenantId },
      // Redis
      {
        name: "REDIS_URL",
        value: process.env.REDIS_URL || "redis://localhost:6379",
      },
      // Security - In production these should be secrets too
      { name: "COOKIE_SECRET", value: crypto.randomBytes(32).toString("hex") },
      { name: "JWT_SECRET", value: crypto.randomBytes(32).toString("hex") },
      { name: "STORE_CORS", value: "*" }, // To be refined
      { name: "ADMIN_CORS", value: "*" }, // To be refined
      { name: "AUTH_CORS", value: "*" }, // To be refined
      // S3 Config
      { name: "S3_REGION", value: "auto" },
    ];

    // Handle DATABASE_URL secret parsing logic:
    // If databaseUrlSecretVersion is a full path "projects/.../versions/1", extract.
    // Cloud Run expects just the secret name if in same project.
    let dbSecretName = databaseUrlSecretVersion;
    let dbSecretVersion = "latest";
    if (databaseUrlSecretVersion.includes("/secrets/")) {
      const parts = databaseUrlSecretVersion.split("/");
      const secretIndex = parts.indexOf("secrets");
      if (secretIndex !== -1 && parts[secretIndex + 1]) {
        dbSecretName = parts[secretIndex + 1]!;
      }
      if (databaseUrlSecretVersion.includes("/versions/")) {
        const v = databaseUrlSecretVersion.split("/versions/")[1];
        if (v) {
          dbSecretVersion = v;
        }
      }
    }

    const envList: any[] = [
      ...envVars,
      {
        name: "DATABASE_URL",
        valueSource: {
          secretKeyRef: {
            secret: dbSecretName,
            version: dbSecretVersion,
          },
        },
      },
      ...r2Secrets.map((s) => ({
        name: s.name,
        valueSource: {
          secretKeyRef: {
            secret: s.secret,
            version: "latest",
          },
        },
      })),
    ];

    const request = {
      parent,
      serviceId: serviceName,
      service: {
        template: {
          containers: [
            {
              image: this.image,
              env: envList,
              resources: {
                limits: {
                  cpu: "1000m",
                  memory: "512Mi",
                },
              },
            },
          ],
          serviceAccount: this.serviceAccount,
          scaling: {
            minInstanceCount: 0,
            maxInstanceCount: 1, // Start small
          },
        },
      },
    };

    try {
      const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
      const authClient = await auth.getClient();
      google.options({ auth: authClient as any });

      // Start long-running operation
      const res = await this.runClient.projects.locations.services.create({
        parent,
        serviceId: serviceName,
        requestBody: request.service as any,
      });

      const operation = (res as any).data;
      logger.info(
        { operationName: operation.name },
        "Cloud Run deployment started",
      );

      // Return a predictable URL for now as we don't wait for LRO
      return `https://${serviceName}-${this.projectId}.a.run.app`;
    } catch (error: any) {
      if (error.code === 409) {
        // Already exists
        logger.info("Service already exists, updating...");
        const fullServiceName = `${parent}/services/${serviceName}`;
        try {
          await this.runClient.projects.locations.services.patch({
            name: fullServiceName,
            requestBody: request.service as any,
          });
          return `https://${serviceName}-${this.projectId}.a.run.app`;
        } catch (patchError) {
          logger.error(
            { error: patchError },
            "Failed to update Cloud Run service",
          );
          throw patchError;
        }
      }

      logger.error({ error }, "Failed to deploy Cloud Run service");
      throw error;
    }
  }
}
