import Cloudflare from "cloudflare";

import { consoleLogger as logger } from "../../utils/logger";

export interface CreateHostnameOptions {
  ssl?: {
    method?: "http" | "txt" | "email";
    type?: "dv";
  };
}

export class CloudflareProvider {
  private client: Cloudflare;
  private zoneId: string;

  constructor() {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!apiToken) {
      throw new Error("CLOUDFLARE_API_TOKEN environment variable is not set");
    }

    if (!zoneId) {
      throw new Error("CLOUDFLARE_ZONE_ID environment variable is not set");
    }

    this.client = new Cloudflare({
      apiToken,
    });
    this.zoneId = zoneId;
  }

  async createCustomHostname(
    tenantId: string,
    hostname: string,
    options?: CreateHostnameOptions,
  ): Promise<void> {
    try {
      logger.info(
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

      logger.info(
        { tenantId, hostname },
        "Successfully created Cloudflare custom hostname",
      );
    } catch (error) {
      logger.error(
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
      logger.error(
        { error, tenantId, hostname },
        "Failed to get hostname status",
      );
      throw error;
    }
  }
}
