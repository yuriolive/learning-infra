# Architecture Overview

**Last Updated**: 2026-01-23

## System Components

This platform uses a **multi-instance provisioning model** where each merchant gets dedicated infrastructure (database + compute).

### 1. Control Plane (Orchestrator)

- **Type**: Shared Cloud Run service
- **Purpose**: Manages tenant lifecycle (create, suspend, delete)
- **Location**: `apps/control-plane/`
- **URL**: `control.vendin.store`
- **Responsibilities**:
  - Merchant provisioning API
  - Neon database creation
  - Cloud Run service deployment for tenants
  - Custom domain management via Cloudflare SaaS

### 2. Storefront (Multi-Tenant Frontend)

- **Type**: Shared Next.js application on Cloudflare Pages
- **Purpose**: Customer-facing application with hostname-based routing
- **Location**: `apps/storefront/`
- **Responsibilities**:
  - **Landing page** at root domain (`vendin.store`) - marketing, pricing, signup
  - **Tenant routing** - routes customer requests to correct tenant backend based on hostname
  - **Customer UI** - product browsing, cart, checkout experience
  - Does NOT just redirect - it proxies/routes requests to tenant backends

**Important**: The storefront is a routing proxy, not a simple redirect service. It maintains the customer-facing UI while communicating with the appropriate tenant backend API.

### 3. Tenant Instances (Individual Merchant Stores)

- **Type**: Dedicated Cloud Run service per merchant
- **Purpose**: Isolated MedusaJS 2.0 backend for each merchant
- **Location**: `apps/tenant-instance/` (template)
- **Service Naming**: `tenant-{tenantId}`
- **Responsibilities**:
  - **Store API** at `/store` - serves storefront with product/cart/checkout data
  - **Admin Dashboard** at `/app` - merchant management interface (MedusaJS built-in admin)
  - Dedicated Neon PostgreSQL database
  - Upstash Redis cache (namespaced per tenant)
  - Scale-to-zero when idle

## User Experiences

### Experience 1: Platform Landing & Signup

**User**: Prospective merchant  
**Domain**: `vendin.store`  
**App**: Storefront (root route)  
**Purpose**: Marketing, pricing, signup

```
Customer → vendin.store
        → Storefront (Cloudflare Pages)
        → Landing page UI
        → Signup form → Control Plane API
```

### Experience 2: Customer Shopping

**User**: End customer  
**Domain**: `{store}.my.vendin.store` or custom domain  
**App**: Storefront (tenant routes) + Tenant Instance (backend)  
**Purpose**: Browse products, add to cart, checkout

```
Customer → merchant1.my.vendin.store
        → Storefront (Cloudflare Pages)
        → Resolves tenant from hostname
        → Routes to tenant-abc123 (Cloud Run MedusaJS)
        → Returns product data
        → Storefront renders customer UI
```

### Experience 3: Merchant Admin

**User**: Merchant/store owner  
**Domain**: `{store}.my.vendin.store/app`  
**App**: Tenant Instance (MedusaJS Admin)  
**Purpose**: Manage products, orders, customers

```
Merchant → merchant1.my.vendin.store/app
        → Cloudflare DNS
        → tenant-abc123 (Cloud Run)
        → MedusaJS Admin Dashboard
        → Dedicated Neon PostgreSQL database
```

**Important**: Each merchant accesses their own isolated admin. There is no shared platform admin for merchants.

## Request Routing Architecture

### Root Domain (vendin.store)

```
vendin.store → Storefront → Landing Page Component
```

### Tenant Subdomain ({store}.my.vendin.store)

```
{store}.my.vendin.store/
  ├─ /                     → Storefront → Customer UI
  ├─ /products             → Storefront → Product List UI
  ├─ /cart                 → Storefront → Cart UI
  └─ /app                  → Direct to Tenant Instance → MedusaJS Admin
     └─ /app/*             → MedusaJS Admin Routes
```

### API Routing (Behind the Scenes)

```
Storefront (Next.js)
  ↓ (identifies tenant from hostname)
  ↓ (makes API calls to)
Tenant Instance API
  ├─ /store/products       → MedusaJS Store API
  ├─ /store/cart           → MedusaJS Store API
  └─ /admin/*              → MedusaJS Admin API
```

## Data Isolation

### Physical Isolation

- Each tenant: **separate Neon PostgreSQL database**
- Each tenant: **dedicated Cloud Run service**
- Each tenant: **namespaced Redis cache**

### No Shared Data

- Merchants cannot access other merchants' data
- Each database instance is physically separate
- Connection strings unique per tenant

## Technology Stack

| Component      | Technology                             | Purpose                         |
| -------------- | -------------------------------------- | ------------------------------- |
| Control Plane  | Hono (TypeScript) on Cloud Run         | Tenant provisioning API         |
| Storefront     | Next.js on Cloudflare Pages            | Customer-facing UI + routing    |
| Tenant Backend | MedusaJS 2.0 (TypeScript) on Cloud Run | Store API + Admin               |
| Database       | Neon Serverless PostgreSQL             | Per-tenant data storage         |
| Cache          | Upstash Redis                          | Per-tenant session/cache        |
| Storage        | Cloudflare R2                          | Product images, assets          |
| DNS/SSL        | Cloudflare for SaaS                    | Custom domains + SSL automation |

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare (DNS + CDN)                   │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
    ┌────────▼─────────┐       ┌────────▼─────────────┐
    │   control.       │       │   *.my.vendin.store  │
    │ vendin.store     │       │   (wildcard)         │
    └────────┬─────────┘       └────────┬─────────────┘
             │                           │
    ┌────────▼──────────────┐   ┌───────▼──────────────┐
    │  Control Plane        │   │   Storefront         │
    │  (Cloud Run)          │   │  (Cloudflare Pages)  │
    │  - Provisioning API   │   │  - Landing page      │
    │  - Neon API calls     │   │  - Tenant routing    │
    │  - GCP automation     │   │  - Customer UI       │
    └───────────────────────┘   └──────┬───────────────┘
                                       │ Routes to:
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
            ┌───────▼─────┐    ┌───────▼─────┐   ┌───────▼─────┐
            │ tenant-abc  │    │ tenant-def  │   │ tenant-xyz  │
            │ (Cloud Run) │    │ (Cloud Run) │   │ (Cloud Run) │
            │ MedusaJS    │    │ MedusaJS    │   │ MedusaJS    │
            └──────┬──────┘    └──────┬──────┘   └──────┬──────┘
                   │                  │                  │
            ┌──────▼──────┐    ┌──────▼──────┐   ┌──────▼──────┐
            │ Neon DB 1   │    │ Neon DB 2   │   │ Neon DB 3   │
            └─────────────┘    └─────────────┘   └─────────────┘
```

## Provisioning Flow

When a new merchant signs up:

1. **Control Plane receives signup** (`POST /api/tenants`)
2. **Create Neon database** via Neon API
3. **Deploy Cloud Run service** for tenant (`tenant-{id}`)
4. **Configure DNS** via Cloudflare API (subdomain)
5. **Bootstrap MedusaJS** - run migrations, seed data
6. **Return credentials** - merchant receives admin URL and credentials

**Target Time**: < 2 minutes end-to-end

## Key Architectural Principles

### 1. Multi-Instance Model (Non-Negotiable)

- NEVER use shared-database multi-tenancy
- Each tenant gets physical database separation
- Complete compute isolation per tenant

### 2. Serverless-First

- All infrastructure must be serverless
- Cloud Run with `min-instances: 0` (scale-to-zero)
- Neon Serverless PostgreSQL
- Upstash Redis (serverless)

### 3. Hostname-Based Routing

- Storefront identifies tenant from request hostname
- No tenant ID in URL paths
- Custom domains supported via Cloudflare for SaaS

### 4. Security & Isolation

- Physical database isolation
- TLS 1.3 for all connections
- JWT-based authentication per tenant
- Secrets in GCP Secret Manager

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Agent responsibilities and guidelines
- [PRD.md](../PRD.md) - Product requirements and specifications
- [@project-overview.md](../.agent/rules/shared/project/project-overview.md) - Core principles and stack
- [@routing.md](../.agent/rules/apps/storefront/routing.md) - Storefront routing patterns
- [docs/setup/](./setup/) - Infrastructure setup guides
