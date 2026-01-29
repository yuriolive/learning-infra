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

- **Type**: Single Next.js Application
- **Purpose**: Resolve tenant by hostname and renders the shopping experience for ALL tenants
- **Location**: `apps/storefront/`
- **Domains**: `*-my.vendin.store` (default subdomains) and custom domains
- **Mechanism**:
  - Middleware resolves `tenantId` from hostname.
  - Fetches tenant-specific config (colors, backend URL).
  - Connects to the specific Tenant Instance for data.

### 3. Tenant Instances (Per-Tenant Backends)

- **Type**: Dedicated Cloud Run service per merchant
- **Purpose**: Headless MedusaJS API + Admin UI
- **Location**: `apps/tenant-instance/`
- **Service Naming**: `tenant-{tenantId}`
- **Responsibilities**:
  - **Headless Store API** (consumed by Shared Storefront)
  - MedusaJS Admin UI (`/app`)
  - Dedicated Neon PostgreSQL database
  - **Config-Driven Features**: Plugins enabled via Env Vars

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
Customer → awesome-store-my.vendin.store
        → **Shared Storefront** (Next.js)
        → Middleware identifies Tenant "A"
        → App fetches config & theme for Tenant "A"
        → App calls API: `tenant-a-xyz.a.run.app/store/*`
        → Renders UI with Tenant A's data
```

**Merchant Admin:**

```
Merchant → awesome-store-my.vendin.store/app
        → Shared Storefront Middleware (optional proxy) OR Direct Backend URL
        → Tenant Instance (MedusaJS Admin)
```

## Related Documentation

- [Strategy & Pivot Plan](../STRATEGY.md)
- [Architectural Decisions](./DECISIONS.md)
- [User Experiences](./USER_EXPERIENCES.md)
- [Cloudflare Setup](../setup/CLOUDFLARE_SETUP.md)
- [Tenant Provisioning](../setup/TENANT_PROVISIONING_SETUP.md)
- [Project Overview](../../.agent/rules/shared/project/project-overview.md)
