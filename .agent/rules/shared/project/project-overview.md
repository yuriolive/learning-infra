---
description: General project overview, core principles, multi-tenant e-commerce platform context, subdomain structure, and service roles.
globs: **/*
---
# Project Overview: Multi-Tenant E-commerce Platform

Multi-tenant e-commerce platform using MedusaJS 2.0 with multi-instance provisioning. Each merchant gets a dedicated backend and database. See `AGENTS.md` for detailed architecture.

## Core Principles

### Multi-Instance Model (Non-Negotiable)
- **NEVER** use shared-database multi-tenancy.
- Each tenant: dedicated Neon PostgreSQL database + isolated Google Cloud Run compute.
- Physical isolation required, not just logical.

### Serverless-First
- All infrastructure must be serverless (Neon, Upstash Redis, Cloud Run with `min-instances: 0`, Cloudflare R2).

## Technology Stack

- **Backend**: MedusaJS 2.0+ (TypeScript only)
- **Frontend**: Next.js on Cloudflare Pages
- **Database**: Neon Serverless PostgreSQL
- **Cache**: Upstash Redis (Serverless)
- **DNS/SSL**: Cloudflare for SaaS
- **Compute**: Google Cloud Run
- **Storage**: Cloudflare R2
- **Analytics**: PostHog

## Subdomain Structure

```
vendin.store                    → Landing page & Signup (root domain)
www.vendin.store                → Redirects to root
control.vendin.store            → Control Plane API
admin.vendin.store              → Platform admin dashboard (optional)
*-my.vendin.store               → Tenant stores (wildcard)
  ├─ {store}-my.vendin.store → Merchant storefront
  └─ {store}-my.vendin.store/admin → Merchant admin (MedusaJS)
```

**Note**: We use the `-my` pattern for SSL coverage today. Planned migration to `.my` once deep wildcard SSL is enabled in Cloudflare.

## Service Roles

### Control Plane (Orchestrator)
- **Type**: Shared Cloud Run service
- **Service Name**: `control-plane`
- **Purpose**: Central API managing tenant provisioning
- **API Endpoint**: `control.vendin.store`
- **Location**: `apps/control-plane/`
- **Responsibilities**:
  - Merchant signup and store creation
  - Database creation via Neon API
  - Cloud Run service provisioning for tenants
  - Custom domain management via Cloudflare SaaS API
  - Tenant lifecycle management (create, suspend, delete)

### Marketing App (Landing)
- **Type**: Cloudflare Pages deployment
- **Purpose**: Marketing site for landing, pricing, and signup
- **Location**: `apps/marketing/`
- **Responsibilities**:
  - Landing page and signup on root domain (`vendin.store`)
  - Marketing content, pricing, and CTAs

### Storefront Router (Tenant Routing Only)
- **Type**: Shared Cloudflare Pages deployment
- **Purpose**: Router-only Next.js app that resolves tenant by hostname
- **Location**: `apps/storefront/`
- **Responsibilities**:
  - Hostname-based tenant resolution
  - Redirect/proxy to tenant instances based on subdomain or custom domain
  - No customer-facing UI rendered here

### Tenant Instances (Individual Stores)
- **Type**: Separate Cloud Run service per tenant
- **Service Naming**: `tenant-{tenantId}` (e.g., `tenant-abc123`)
- **Purpose**: Isolated MedusaJS 2.0 backend instances
- **Location**: `apps/tenant-instance/` (template)
- **Responsibilities**:
  - Serve custom storefront UI (customer experience)
  - Serve `/store` API (MedusaJS store API)
  - Serve `/admin` UI + API (merchant admin)
  - Each tenant has dedicated database and compute
  - Scale-to-zero when idle

## Code Organization

```
/
├── apps/
│   ├── control-plane/      # Orchestrator API (tenant provisioning)
│   ├── marketing/          # Marketing landing app (root domain)
│   ├── storefront/         # Router-only storefront (tenant domains)
│   └── tenant-instance/    # MedusaJS template/boilerplate
├── packages/
│   ├── config/             # Shared config (ESLint, TS, Prettier)
│   └── utils/              # Shared utilities
└── docs/
    └── setup/              # Infrastructure setup guides
```

## Request Flow

**Landing/Signup:**
```
Customer → vendin.store
        → Marketing app (Cloudflare Pages)
        → Landing page, signup form, marketing
```

**Tenant Store:**
```
Customer → {store}-my.vendin.store OR shop.merchant.com
        → Cloudflare (DNS + SSL + CDN)
        → Storefront router (Cloudflare Pages)
        → Resolves tenant from hostname
        → Redirect/proxy to tenant-{id} (Cloud Run)
        → Tenant instance serves custom storefront UI
        → Tenant Database (Neon PostgreSQL)
```

## Documentation Structure

All documentation lives in `docs/` with consistent organization:

### Pattern
```
docs/
├── {topic}/
│   ├── README.md                 # Overview and quick reference
│   ├── CURRENT_STATE.md          # Current implementation (optional)
│   ├── PLANNED_IMPROVEMENTS.md   # Future plans (optional)
│   └── {SPECIFIC_COMPONENT}.md   # Component-specific docs
```

### Naming Conventions
- **Directories**: lowercase with hyphens (`test/`, `deployment/`)
- **README files**: `README.md` (always present)
- **State files**: `CURRENT_STATE.md`, `PLANNED_IMPROVEMENTS.md`
- **Component files**: `UPPERCASE_WITH_UNDERSCORES.md` (e.g., `CONTROL_PLANE.md`)

### Rules
1. Never create standalone docs in `docs/` root (use subdirectories)
2. Always create `README.md` with quick reference
3. Use UPPERCASE_WITH_UNDERSCORES for component-specific docs
4. Keep docs DRY - reference detailed content, don't duplicate
5. Include "Related Documentation" section with links

## References

- **Architecture**: See [docs/architecture/README.md](../../../docs/architecture/README.md) for detailed architecture and flows.
- **Requirements**: See `PRD.md` for project requirements.
- **Setup Guides**: See `docs/setup/` for infrastructure setup documentation.
- **External docs**: MedusaJS 2.0, Neon API, Google Cloud Run, Cloudflare for SaaS (see `AGENTS.md` Resources section).
- **Service naming**: See [@references.md](../references.md)
