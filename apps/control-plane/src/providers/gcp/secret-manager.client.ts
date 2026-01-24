import { google } from "googleapis";
import { createLogger } from "@vendin/utils/logger";

const logger = createLogger({
  logLevel: process.env.LOG_LEVEL,
  nodeEnv: process.env.NODE_ENV ?? "development",
});

export class SecretManagerProvider {
  private client;
  private projectId: string;

  constructor() {
    this.client = google.secretmanager("v1");
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || "vendin-store";
  }

  /**
   * Creates a new secret with the given value.
   * @param secretId - The ID of the secret to create (e.g., "tenant-123-db-url").
   * @param value - The secret payload (string).
   * @returns The resource name of the secret version.
   */
  async createSecret(secretId: string, value: string): Promise<string> {
    const parent = `projects/${this.projectId}`;

    try {
      // 1. Create the Secret (container)
      try {
        const auth = new google.auth.GoogleAuth({
          scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });
        const authClient = await auth.getClient();
        google.options({ auth: authClient as any });

        await this.client.projects.secrets.create({
          parent,
          secretId,
          requestBody: {
            replication: {
              automatic: {},
            },
          },
        });
      } catch (error: any) {
        if (error.code !== 409) {
          // Ignore if already exists
          throw error;
        }
      }

      // 2. Add a Secret Version
      // Type definition might be missing 'addVersion', casting to any to allow dynamic method or 'addVersion'
      const versions = this.client.projects.secrets.versions as any;
      const { data: version } = await versions.addVersion({
        parent: `${parent}/secrets/${secretId}`,
        requestBody: {
          payload: {
            data: Buffer.from(value).toString("base64"),
          },
        },
      });

      if (!version.name) {
        throw new Error("Failed to retrieve secret version name");
      }

      return version.name;
    } catch (error) {
      logger.error({ error, secretId }, "Failed to create secret");
      throw error;
    }
  }
}
