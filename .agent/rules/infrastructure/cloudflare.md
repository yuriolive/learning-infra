---
description: Cloudflare for SaaS patterns, Pages deployment, and custom domain management.
globs: apps/storefront/**/*, infrastructure/**/*
---
# Cloudflare Infrastructure Rules

## Storefront Deployment (Cloudflare Pages)

- **Platform**: Cloudflare Pages
- **Framework**: Next.js with edge runtime
- **Root Domain**: `vendin.store` (landing page and signup)
- **Wildcard DNS**: `*.my.vendin.store` → Storefront Pages URL

## Cloudflare for SaaS (Custom Domains)

The Control Plane uses Cloudflare API to manage custom hostnames.

See [docs/examples/cloudflare-api-integration.ts](../../docs/examples/cloudflare-api-integration.ts) for API integration patterns.

### SSL Provisioning

- SSL certificates automatically provisioned via Cloudflare for SaaS
- Poll status every 30 seconds
- Maximum wait: 24 hours
- Alert if status is "failed"

## Hostname Resolution Pattern

Storefront must resolve tenants from hostname. See [docs/examples/hostname-routing.ts](../../docs/examples/hostname-routing.ts) for implementation patterns.

## Reserved Subdomains

See [@references.md](../shared/references.md) for reserved subdomains list.

## DNS Configuration

- **Wildcard for tenants**: `*.my` CNAME → Storefront Pages URL
- **Control Plane**: `control` CNAME → `ghs.googlehosted.com` (DNS only)
- **Root domain**: `@` A/CNAME → Storefront Pages URL

## References

- **Subdomain structure**: See [@project-overview.md](../shared/project/project-overview.md)
- **Hostname routing**: See [@routing.md](../apps/storefront/routing.md)
- **Code examples**: See [docs/examples/](../../docs/examples/)
