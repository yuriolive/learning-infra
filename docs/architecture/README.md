# Architecture Overview

**Last Updated**: 2026-01-23  
**Status**: Active  
**Component**: `apps/marketing/`, `apps/storefront/`, `apps/tenant-instance/`

## System Components

This platform uses a **multi-instance provisioning model** where each merchant gets dedicated infrastructure (database + compute). The shared storefront is **router-only** and each tenant instance serves its **custom storefront UI** and **MedusaJS APIs**.

### 1. Marketing App (Landing Page)

- **Type**: Next.js app on Cloudflare Pages
- **Purpose**: Marketing, pricing, and signup
- **Location**: `apps/marketing/`
- **Domain**: `vendin.store` (root domain)

### 2. Storefront Router (Shared)

- **Type**: Next.js router on Cloudflare Pages
- **Purpose**: Resolve tenant by hostname and redirect/proxy
- **Location**: `apps/storefront/`
- **Domains**: `*-my.vendin.store` (default subdomains) and custom domains
- **Note**: Does **not** render customer UI

### 3. Tenant Instances (Per-Tenant)

- **Type**: Dedicated Cloud Run service per merchant
- **Purpose**: Custom storefront UI + MedusaJS APIs + Admin UI
- **Location**: `apps/tenant-instance/` (template)
- **Service Naming**: `tenant-{tenantId}`
- **Responsibilities**:
  - Custom storefront UI (per-tenant themes/customizations)
  - MedusaJS Store API (`/store`)
  - MedusaJS Admin UI (`/admin`) and API
  - Dedicated Neon PostgreSQL database

## Domain Structure

```
vendin.store                    → Marketing app (landing + signup)
www.vendin.store                → Redirects to root (optional)
control.vendin.store            → Control Plane API
admin.vendin.store              → Platform admin dashboard (optional)
*-my.vendin.store               → Tenant stores (wildcard/hyphenated)
  ├─ awesome-store-my.vendin.store → Tenant storefront UI (served by tenant instance)
  └─ awesome-store-my.vendin.store/admin → Tenant admin (MedusaJS)
```

**Note**: The platform uses the `-my` pattern for SSL coverage. We plan to migrate to `.my` in the future once Cloudflare deep wildcard SSL is enabled.

## Request Flow

**Marketing (Root Domain):**

```
Customer → vendin.store
        → Marketing app (Cloudflare Pages)
        → Landing page, pricing, signup
```

**Tenant Store (Default Subdomain or Custom Domain):**

```
Customer → awesome-store-my.vendin.store OR shop.merchant.com
        → Storefront router (Cloudflare Pages)
        → Resolve tenant from hostname
        → Redirect/proxy to tenant-{id} (Cloud Run)
        → Tenant instance serves custom UI + APIs
```

**Merchant Admin:**

```
Merchant → awesome-store-my.vendin.store/admin
        → Storefront router
        → Tenant instance (MedusaJS admin)
```

## Related Documentation

- [Architectural Decisions](./DECISIONS.md)
- [User Experiences](./USER_EXPERIENCES.md)
- [Cloudflare Setup](../setup/CLOUDFLARE_SETUP.md)
- [Tenant Provisioning](../setup/TENANT_PROVISIONING_SETUP.md)
- [Project Overview](../../.agent/rules/shared/project/project-overview.md)
