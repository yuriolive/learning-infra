import { isPrivateIp, resolveIps } from "@vendin/utils";
import { z } from "zod";

import type { consoleLogger } from "@vendin/logger";

export interface WhatsAppTenant {
  id: string;
  apiUrl: string | null;
}

export interface TenantLookup {
  findByWhatsAppPhoneId(phoneId: string): Promise<WhatsAppTenant | null>;
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
                      display_phone_number: z.string().optional(),
                      phone_number_id: z.string().optional(),
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

      const promises: Array<Promise<void>> = [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          promises.push(
            this.processChange(change, payload).catch((error) => {
              this.logger.error(
                { error },
                "Failed to process WhatsApp webhook change",
              );
            }),
          );
        }
      }
      await Promise.all(promises);
    } catch (error) {
      this.logger.error({ error }, "Error processing WhatsApp webhook");
      throw error; // Re-throw to return 500 to caller
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async processChange(change: any, payload: unknown): Promise<void> {
    const value = change.value;
    if (!value) return;

    // Extract recipient phone number ID (the tenant's WhatsApp phone ID)
    const recipientPhoneId = value.metadata?.phone_number_id;
    const recipientPhone = value.metadata?.display_phone_number;

    if (
      (!recipientPhoneId || typeof recipientPhoneId !== "string") &&
      (!recipientPhone || typeof recipientPhone !== "string")
    ) {
      this.logger.warn(
        "Received WhatsApp webhook without phone_number_id and display_phone_number",
      );
      return;
    }

    // Lookup tenant
    let tenant: WhatsAppTenant | null = null;
    if (recipientPhoneId && typeof recipientPhoneId === "string") {
      tenant = await this.tenantLookup.findByWhatsAppPhoneId(recipientPhoneId);
    }

    if (!tenant && recipientPhone && typeof recipientPhone === "string") {
      const formattedPhone = recipientPhone.replaceAll(/\D/g, "");
      tenant = await this.tenantLookup.findByWhatsAppNumber(formattedPhone);
    }

    if (!tenant) {
      this.logger.warn(
        { phoneId: recipientPhoneId, phone: recipientPhone },
        "Tenant not found for WhatsApp phone ID or display number",
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

    // SSRF Protection: Resolve hostname and validate IPs
    if (!(await this.validateApiUrl(tenant.apiUrl, tenant.id))) {
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

  private async validateApiUrl(
    apiUrl: string,
    tenantId: string,
  ): Promise<boolean> {
    try {
      const url = new URL(apiUrl);
      const ips = await resolveIps(url.hostname);

      if (ips.length === 0 || ips.some((ip: string) => isPrivateIp(ip))) {
        this.logger.error(
          { tenantId, apiUrl, resolvedIps: ips },
          "Blocked forwarding to private/internal URL (SSRF Protection)",
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(
        { tenantId, apiUrl, error },
        "Blocked forwarding due to invalid URL or resolution error (SSRF Protection)",
      );
      return false;
    }
  }
}
