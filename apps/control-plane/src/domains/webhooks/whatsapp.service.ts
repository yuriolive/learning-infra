import type { Logger } from "../../utils/logger";
import type { TenantRepository } from "../tenants/tenant.repository";

export class WhatsappWebhookService {
  constructor(
    private tenantRepository: TenantRepository,
    private logger: Logger,
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
          const value = change.value;
          if (!value) continue;

          // Extract recipient phone number (the tenant's phone number)
          const recipientPhone = value.metadata?.display_phone_number;
          if (!recipientPhone) {
            this.logger.warn(
              "Received WhatsApp webhook without recipient phone number",
            );
            continue;
          }

          // Format phone number to match database stored format if needed
          const formattedPhone = recipientPhone.replaceAll(/\D/g, "");

          // Lookup tenant
          const tenant =
            await this.tenantRepository.findByWhatsAppNumber(formattedPhone);

          if (!tenant) {
            this.logger.warn(
              { phone: formattedPhone },
              "Tenant not found for WhatsApp number",
            );
            continue;
          }

          if (!tenant.apiUrl) {
            this.logger.warn(
              { tenantId: tenant.id },
              "Tenant string apiUrl not configured, skipping WhatsApp forwarding",
            );
            continue;
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
    } catch (error) {
      this.logger.error({ error }, "Error processing WhatsApp webhook");
      throw error; // Re-throw to return 500 to caller
    }
  }
}
