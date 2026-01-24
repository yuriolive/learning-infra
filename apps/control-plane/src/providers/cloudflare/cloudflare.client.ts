import { S3Client, ListBucketsCommand, type S3ClientConfig } from "@aws-sdk/client-s3";
import { createLogger } from "@vendin/utils/logger";

const logger = createLogger({
  logLevel: process.env.LOG_LEVEL,
  nodeEnv: process.env.NODE_ENV ?? "development",
});

export class CloudflareProvider {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    // We expect these global env vars to be present in Control Plane
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || "auto";
    this.bucketName = process.env.S3_BUCKET || "vendin-store-assets";

    const config: S3ClientConfig = {
      region,
      credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
      },
    };

    if (endpoint) {
        config.endpoint = endpoint;
    }

    this.s3Client = new S3Client(config);
  }

  /**
   * Validates access to the R2 bucket.
   * @returns True if accessible, false otherwise.
   */
  async validateR2Access(): Promise<boolean> {
    try {
      logger.info("Validating R2 access...");
      // Simple check: List buckets to verify credentials
      const command = new ListBucketsCommand({});
      await this.s3Client.send(command);

      logger.info("R2 access validated successfully.");
      return true;
    } catch (error) {
      logger.error({ error }, "Failed to validate R2 access");
      return false;
    }
  }
}
