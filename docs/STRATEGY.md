# The "Lockstep MVP" Strategy

**Status**: Active  
**Adopted**: 2026-01-28

This document defines the architectural strategy for pivoting Vendin to a streamlined, scalable MVP model.

## Core Philosophy: "Complexity by Configuration, Not Code"

To balance the need for tenant-specific integrations (ERPs, Payments) with the need for low engineering overhead, we adopt a **Single Version Policy**.

We treat the entire fleet of tenants as a single unit. When we release `v2.0`, we upgrade **everyone**. We do not support mixed versions.

## 1. Architecture: The "Config-Driven" Hybrid

We combine a purely shared frontend with isolated, config-driven backends.

### A. Storefront: Single Shared Application

- **Type**: Next.js App (Single Deployment)
- **Role**: Serves the UI for _all_ tenants.
- **Routing**: Uses Middleware to resolve the tenant from the hostname (`store-a.vendin.store` → `tenant-a`).
- **Connection**: Dynamically connects to the correct backend API using the `x-medusa-backend-url` header or Client Context.
- **Benefit**: We maintain and deploy only **one** UI codebase.
- **Cost**: Near zero.

### B. Backend: Multi-Instance "Mega-Image"

- **Type**: Isolated Cloud Run Services (`tenant-a`, `tenant-b`)
- **Role**: Handles business logic, database, and admin API.
- **Strategy**: **One Docker Image to Rule Them All.**
  - The image contains **ALL** supported plugins (Stripe, Pagar.me, Bling, TinyERP) installed in `node_modules`.
  - Plugins are **disabled by default**.
  - **Environment Variables** toggle specific integrations per tenant.

**Example Configuration:**

| Tenant       | Cloud Run Env Vars                                      | Result                   |
| :----------- | :------------------------------------------------------ | :----------------------- |
| **Tenant A** | `MEDUSA_PAYMENT_STRIPE=true`<br>`MEDUSA_ERP_BLING=true` | Uses Stripe & Bling.     |
| **Tenant B** | `MEDUSA_PAYMENT_PAGARME=true`<br>`MEDUSA_ERP_TINY=true` | Uses Pagar.me & TinyERP. |

## 2. Deployment Workflow: The "Canary" Method

Since we update everyone at once, safety is paramount.

1.  **Step 1: The Canary (Staging)**
    - Deploy new Storefront.
    - Upgrade internal `dev-store` backend to new image tag.
    - Manual verification.

2.  **Step 2: The Broadcast (Production)**
    - CI/CD Loop triggers updates for **ALL** active Cloud Run services to the new image tag.
    - Zero-downtime deployment handled by Cloud Run.

## 3. Key Decisions

| Feature          | Approach                      | Why?                                                        |
| :--------------- | :---------------------------- | :---------------------------------------------------------- |
| **Integrations** | **Pre-installed & Toggled**   | Avoids complex dynamic loading; simplifies build process.   |
| **Versioning**   | **Lockstep (Single Version)** | Removes "compatibility matrix" hell. everyone is on Latest. |
| **Storefront**   | **Single App + Middleware**   | Removes need for 100s of Vercel/Cloudflare projects.        |
| **Isolation**    | **Physical (Cloud Run + DB)** | Security & performance isolation is non-negotiable.         |
