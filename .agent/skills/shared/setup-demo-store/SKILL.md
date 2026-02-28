---
name: setup-demo-store
description: Provisions a persistent demo tenant in the staging environment and seeds it with realistic product, customer, and order data. Use when asked to provision a demo store, set up staging demo data, seed the staging environment, or reset the demo store. Corresponds to task T2 in docs/test/IMPLEMENTATION.md. Requires T1 (staging environment) to be complete first.
---

# Setup Demo Store

Provisions and seeds a permanent demo tenant in staging. This store is the target for smoke tests and Playwright E2E tests after every staging deploy.

## Project Documentation References

- **[@provisioning.md](../../../rules/apps/control-plane/provisioning.md)** - Tenant provisioning patterns
- **[@database.md](../../../rules/infrastructure/database.md)** - Neon database patterns
- **[STRATEGY.md](../../../../docs/test/STRATEGY.md)** - Demo Store section
- **[IMPLEMENTATION.md](../../../../docs/test/IMPLEMENTATION.md)** - Task T2 prompt and acceptance criteria

## Prerequisites

- T1 (staging environment) must be complete — the staging control-plane URL must be accessible
- `STAGING_CONTROL_PLANE_URL` environment variable must be set

## Workflow

### Step 1: Read provisioning patterns

```
gcp/workflows/provision-tenant.yaml
apps/control-plane/src/domains/tenants/tenant.routes.ts
docs/setup/STAGING_SETUP.md
```

### Step 2: Create provision script

Create `scripts/staging/provision-demo-store.ts`:
1. POST to `{STAGING_CONTROL_PLANE_URL}/api/tenants` with `{ name: "Demo Store", domain: "demo-store" }`
2. Poll status endpoint every 10s until `status === "active"` or 10-minute timeout
3. Write tenant ID, API URL, and storefront URL to `.staging/demo-store.json`

### Step 3: Create seed script

Create `scripts/staging/seed-demo-store.ts`:
1. Read `.staging/demo-store.json` for the tenant's DB connection
2. Connect to the tenant's Neon DB
3. Seed: 3 categories, 10 products with variants, 2 customers, 5 orders

### Step 4: Add package.json scripts

```json
{
  "staging:demo:provision": "tsx scripts/staging/provision-demo-store.ts",
  "staging:demo:seed": "tsx scripts/staging/seed-demo-store.ts",
  "staging:demo:reset": "tsx scripts/staging/seed-demo-store.ts --reset"
}
```

### Step 5: Document

Create `docs/test/DEMO_STORE.md` with URLs, credentials, and reset instructions.

## Constraints

- Scripts must be idempotent — safe to run twice without creating duplicates
- Seed data must use realistic names and valid price/status values
- `.staging/demo-store.json` must be gitignored
- Scripts must clean up and exit non-zero on failure
