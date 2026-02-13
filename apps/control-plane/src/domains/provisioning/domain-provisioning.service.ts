import { type CloudflareProvider } from "../../providers/cloudflare/cloudflare.client";
import { type Logger } from "../../utils/logger";
import { type TenantRepository } from "../tenants/tenant.repository";
import { type Tenant } from "../tenants/tenant.types";

interface AcmeValidationRecord {
  http_url?: string;
  http_body?: string;
}

export interface DomainProvisioningServiceConfig {
  tenantRepository: TenantRepository;
  cloudflareProvider: CloudflareProvider;
  logger: Logger;
  tenantBaseDomain: string;
  storefrontHostname: string;
}

export class DomainProvisioningService {
  private tenantRepository: TenantRepository;
  private cloudflareProvider: CloudflareProvider;
  private logger: Logger;
  private tenantBaseDomain: string;
  private storefrontHostname: string;

  constructor(config: DomainProvisioningServiceConfig) {
    this.tenantRepository = config.tenantRepository;
    this.cloudflareProvider = config.cloudflareProvider;
    this.logger = config.logger;
    this.tenantBaseDomain = config.tenantBaseDomain;
    this.storefrontHostname = config.storefrontHostname;
  }

  async configureDomain(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant || !tenant.subdomain) throw new Error("Subdomain missing");

    const subdomain = tenant.subdomain;
    let hostname: string;
    let isDefaultDomain = false;

    if (subdomain.includes(".")) {
      // Custom domain (BYO domain strategy)
      hostname = subdomain;
    } else {
      // Default domain (e.g. boom3 -> boom3-my.vendin.store)
      hostname = `${subdomain}${this.tenantBaseDomain}`;
      isDefaultDomain = true;
    }

    this.logger.info(
      { tenantId, subdomain, hostname, isDefaultDomain },
      "Configuring Cloudflare domain",
    );

    await (isDefaultDomain
      ? this.configureDefaultDomain(tenantId, hostname)
      : this.configureCustomDomain(tenantId, hostname, tenant.metadata));
  }

  private async configureDefaultDomain(
    tenantId: string,
    hostname: string,
  ): Promise<void> {
    this.logger.info(
      { tenantId, hostname },
      "Configuring default flattened domain",
    );

    // 1. Skip Custom Hostname creation (Covered by Wildcard SSL)
    this.logger.info(
      { tenantId, hostname },
      "Skipping Cloudflare custom hostname creation (Covered by Wildcard SSL)",
    );

    // 2. Create CNAME record to route to storefront
    // [tenant]-my.vendin.store -> CNAME -> [storefront_hostname] (Proxied)
    try {
      await this.cloudflareProvider.createDnsRecord({
        type: "CNAME",
        name: hostname,
        content: this.storefrontHostname,
        proxied: true,
        comment: `Default domain for tenant ${tenantId}`,
      });
      this.logger.info(
        { tenantId, hostname, target: this.storefrontHostname },
        "Created proxied CNAME record for default domain",
      );
    } catch (error: unknown) {
      // Check for duplicate record errors:
      // 81053: A, AAAA, or CNAME record with that host already exists
      // 81057: Record already exists
      const cfError = error as {
        code?: number;
        response?: { body?: { errors?: Array<{ code?: number }> } };
      };
      const errorCode =
        cfError.code || cfError.response?.body?.errors?.[0]?.code || 0;

      if (errorCode === 81_053 || errorCode === 81_057) {
        this.logger.warn(
          { error, tenantId, hostname },
          "Failed to create CNAME record (might already exist)",
        );
      } else {
        throw error;
      }
    }
  }

  private async configureCustomDomain(
    tenantId: string,
    hostname: string,
    tenantMetadata: Tenant["metadata"],
  ): Promise<void> {
    this.logger.info(
      { tenantId, hostname },
      "Creating Cloudflare custom hostname for custom domain",
    );

    const result = await this.cloudflareProvider.createCustomHostname(
      tenantId,
      hostname,
    );

    await this.handleAcmeValidation(tenantId, result, hostname, tenantMetadata);
  }

  private async handleAcmeValidation(
    tenantId: string,
    result: unknown,
    hostname: string,
    tenantMetadata: Tenant["metadata"],
  ): Promise<void> {
    const cfResult = result as {
      ssl?: {
        validation_records?: Array<{
          http_url?: string;
          http_body?: string;
        }>;
      };
    };

    if (cfResult?.ssl?.validation_records) {
      const httpValidation = cfResult.ssl.validation_records.find(
        (r: AcmeValidationRecord) => r.http_url && r.http_body,
      );

      if (
        httpValidation &&
        httpValidation.http_url &&
        httpValidation.http_body
      ) {
        this.logger.info(
          { tenantId, hostname },
          "Found ACME HTTP validation record, updating tenant metadata",
        );

        // Extract token from URL: http://hostname/.well-known/acme-challenge/<token>
        const token = new URL(httpValidation.http_url).pathname
          .split("/")
          .pop();
        const response = httpValidation.http_body;

        await this.tenantRepository.update(tenantId, {
          metadata: {
            ...(tenantMetadata as Record<string, unknown>),
            acmeChallenge: {
              token,
              response,
            },
          },
        });
      }
    }
  }
}
