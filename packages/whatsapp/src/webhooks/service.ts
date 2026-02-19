import type { consoleLogger } from "@vendin/logger";

export interface WhatsAppTenant {
  id: string;
  apiUrl: string | null;
}

export interface TenantLookup {
  findByWhatsAppNumber(phone: string): Promise<WhatsAppTenant | null>;
}

export class WhatsappWebhookService {
  constructor(
    private tenantLookup: TenantLookup,
    private logger: typeof consoleLogger,
  ) {}
  async handleIncomingWebhook(payload: unknown): Promise<void> {
    try {
      // Assuming payload follows Meta's WhatsApp Cloud API format:
      // payload.entry[0].changes[0].value.metadata.display_phone_number or similar
      const typedPayload = payload as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              metadata?: {
                display_phone_number?: string;
              };
            };
          }>;
        }>;
      };

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
