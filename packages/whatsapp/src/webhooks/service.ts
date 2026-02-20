import { z } from "zod";

import type { consoleLogger } from "@vendin/logger";

export interface WhatsAppTenant {
  id: string;
  apiUrl: string | null;
}

export interface TenantLookup {
  findByWhatsAppNumber(phone: string): Promise<WhatsAppTenant | null>;
}

const whatsappPayloadSchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z
                .object({
                  metadata: z
                    .object({
                      display_phone_number: z.string(),
                    })
                    .optional(),
                })
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export class WhatsappWebhookService {
  constructor(
    private tenantLookup: TenantLookup,
    private logger: typeof consoleLogger,
  ) {}
  async handleIncomingWebhook(payload: unknown): Promise<void> {
    try {
      const parseResult = whatsappPayloadSchema.safeParse(payload);
      if (!parseResult.success) {
        this.logger.warn(
          { error: parseResult.error },
          "Invalid WhatsApp webhook payload",
        );
        return;
      }
      const typedPayload = parseResult.data;

      const entries = typedPayload.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          await this.processChange(change, payload);
        }
      }
    } catch (error) {
      this.logger.error({ error }, "Error processing WhatsApp webhook");
      throw error; // Re-throw to return 500 to caller
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async processChange(change: any, payload: unknown): Promise<void> {
    const value = change.value;
    if (!value) return;

    // Extract recipient phone number (the tenant's phone number)
    const recipientPhone = value.metadata?.display_phone_number;
    if (!recipientPhone || typeof recipientPhone !== "string") {
      this.logger.warn(
        "Received WhatsApp webhook without recipient phone number",
      );
      return;
    }

    // Format phone number to match database stored format if needed
    const formattedPhone = recipientPhone.replaceAll(/\D/g, "");

    // Lookup tenant
    const tenant = await this.tenantLookup.findByWhatsAppNumber(formattedPhone);

    if (!tenant) {
      this.logger.warn(
        { phone: formattedPhone },
        "Tenant not found for WhatsApp number",
      );
      return;
    }

    if (!tenant.apiUrl) {
      this.logger.warn(
        { tenantId: tenant.id },
        "Tenant string apiUrl not configured, skipping WhatsApp forwarding",
      );
      return;
    }

    // SSRF Protection: Validate that apiUrl is not pointing to private/internal IPs
    if (isPrivateUrl(tenant.apiUrl)) {
      this.logger.error(
        { tenantId: tenant.id, apiUrl: tenant.apiUrl },
        "Blocked forwarding to private/internal URL (SSRF Protection)",
      );
      return;
    }

    // Forward payload to tenant instance
    const tenantWebhookUrl = new URL(
      "/webhooks/whatsapp",
      tenant.apiUrl,
    ).toString();

    this.logger.info(
      { tenantId: tenant.id, url: tenantWebhookUrl },
      "Forwarding WhatsApp webhook to tenant",
    );

    const response = await fetch(tenantWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass along some headers if necessary to authenticate with tenant instance
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      this.logger.error(
        {
          tenantId: tenant.id,
          status: response.status,
          body: await response.text(),
        },
        "Failed to forward WhatsApp webhook to tenant",
      );
    }
  }
}

/**
 * Basic SSRF protection - check if URL points to private/internal network
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    // Check for common private ranges
    // 127.0.0.1, localhost, ::1
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    ) {
      return true;
    }

    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
    const privateIpRegex =
      /^(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+)$/;
    if (privateIpRegex.test(hostname)) return true;

    return false;
  } catch {
    return true; // Invalid URL is considered unsafe
  }
}
