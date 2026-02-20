import { validateSsrfProtection } from "@vendin/utils";
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

  private async processChange(
    change: Record<string, unknown>,
    payload: unknown,
  ): Promise<void> {
    const value = change.value as Record<string, unknown>;
    if (!value) return;

    const tenant = await this.findTenant(value);
    if (!tenant) return;

    if (!tenant.apiUrl) {
      this.logger.warn(
        { tenantId: tenant.id },
        "Tenant string apiUrl not configured, skipping WhatsApp forwarding",
      );
      return;
    }

    // SSRF Protection: Validate hostname and resolved IPs
    try {
      await this.validateWebhookUrlSafely(tenant.apiUrl, tenant.id);
    } catch {
      // Error already logged by validateWebhookUrlSafely
      return;
    }

    await this.forwardToTenant(tenant, payload);
  }

  private async findTenant(
    value: Record<string, unknown>,
  ): Promise<WhatsAppTenant | null> {
    const { phoneId, phone } = this.extractContactInfo(value);

    if (!phoneId && !phone) {
      this.logger.warn(
        "Received WhatsApp webhook without phone_number_id and display_phone_number",
      );
      return null;
    }

    const tenant = await this.lookupTenantByContact(phoneId, phone);

    if (!tenant) {
      this.logger.warn(
        { phoneId, phone },
        "Tenant not found for WhatsApp phone ID or display number",
      );
    }

    return tenant;
  }

  private extractContactInfo(value: Record<string, unknown>): {
    phoneId: string | null;
    phone: string | null;
  } {
    const metadata = value.metadata as Record<string, unknown> | undefined;
    const phoneId = metadata?.phone_number_id;
    const phone = metadata?.display_phone_number;

    return {
      phoneId: typeof phoneId === "string" ? phoneId : null,
      phone: typeof phone === "string" ? phone : null,
    };
  }

  private async lookupTenantByContact(
    phoneId: string | null,
    phone: string | null,
  ): Promise<WhatsAppTenant | null> {
    if (phoneId) {
      const tenant = await this.tenantLookup.findByWhatsAppPhoneId(phoneId);
      if (tenant) return tenant;
    }

    if (phone) {
      const formattedPhone = phone.replaceAll(/\D/g, "");
      return this.tenantLookup.findByWhatsAppNumber(formattedPhone);
    }

    return null;
  }

  private async forwardToTenant(
    tenant: WhatsAppTenant,
    payload: unknown,
  ): Promise<void> {
    const apiUrl = tenant.apiUrl!;
    const originalUrl = new URL(apiUrl);
    const tenantWebhookUrl = new URL(
      "/webhooks/whatsapp",
      originalUrl.toString(),
    ).toString();

    this.logger.info(
      {
        tenantId: tenant.id,
        url: tenantWebhookUrl,
        originalHost: originalUrl.hostname,
      },
      "Forwarding WhatsApp webhook to tenant",
    );

    const response = await fetch(tenantWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  private async validateWebhookUrlSafely(
    apiUrl: string,
    tenantId: string,
  ): Promise<void> {
    try {
      const url = new URL(apiUrl);
      await validateSsrfProtection(url, url.hostname, this.logger);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          {
            apiUrl,
            tenantId,
            error: error.message,
          },
          "Failed to validate instance webhook URL",
        );
      }
      throw error;
    }
  }
}
