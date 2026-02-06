import Cloudflare from "cloudflare";

import { type Logger } from "../../utils/logger";

export interface CreateHostnameOptions {
  ssl?: {
    method?: "http" | "txt" | "email";
    type?: "dv";
  };
}

export interface CloudflareProviderConfig {
  apiToken: string;
  zoneId: string;
  logger: Logger;
}

export class CloudflareProvider {
  private client: Cloudflare;
  private zoneId: string;
  private logger: Logger;

  constructor(config: CloudflareProviderConfig) {
    this.client = new Cloudflare({
      apiToken: config.apiToken,
    });
    this.zoneId = config.zoneId;
    this.logger = config.logger;
  }

  async createCustomHostname(
    tenantId: string,
    hostname: string,
    options?: CreateHostnameOptions,
  ): Promise<void> {
    try {
      this.logger.info(
        { tenantId, hostname },
        "Creating Cloudflare custom hostname",
      );

      await this.client.customHostnames.create({
        zone_id: this.zoneId,
        hostname,
        ssl: {
          method: options?.ssl?.method ?? "http",
          type: options?.ssl?.type ?? "dv",
        },
      });

      this.logger.info(
        { tenantId, hostname },
        "Successfully created Cloudflare custom hostname",
      );
    } catch (error) {
      this.logger.error(
        { error, tenantId, hostname },
        "Failed to create Cloudflare custom hostname",
      );
      throw error;
    }
  }

  async getHostnameStatus(
    tenantId: string,
    hostname: string,
  ): Promise<{ status: string; verification_errors?: string[] }> {
    try {
      // Cloudflare API doesn't allow getting by ID easily if we don't store it,
      // but we can list and filter by hostname.
      const response = await this.client.customHostnames.list({
        zone_id: this.zoneId,
        hostname,
      });

      const customHostname = response.result.find(
        (h) => h.hostname === hostname,
      );

      if (!customHostname) {
        throw new Error(`Hostname ${hostname} not found in Cloudflare`);
      }

      return {
        status: customHostname.status || "unknown",
        ...(customHostname.verification_errors
          ? { verification_errors: customHostname.verification_errors }
          : {}),
      };
    } catch (error) {
      this.logger.error(
        { error, tenantId, hostname },
        "Failed to get hostname status",
      );
      throw error;
    }
  }
}
