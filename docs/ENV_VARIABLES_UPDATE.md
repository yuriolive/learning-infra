# Control Plane Environment Variables - Update Summary

**Date**: 2026-01-24  
**Issue**: Missing environment variables in `wrangler.jsonc` and documentation

## What Was Updated

### 1. [`apps/control-plane/wrangler.jsonc`](file:///c:/Users/yuri_/IdeaProjects/learning-infra/apps/control-plane/wrangler.jsonc)

**Added Secrets Store Bindings**:

- `ADMIN_API_KEY` → `control-plane-admin-api-key`
- `CLOUDFLARE_API_TOKEN` → `cloudflare-api-token`
- `CLOUDFLARE_ZONE_ID` → `cloudflare-zone-id`

**Added Environment Variables**:

- `ALLOWED_ORIGINS`: `"https://vendin.store,https://www.vendin.store"`
- `LOG_LEVEL`: `"info"`
- `NODE_ENV`: `"production"`

### 2. [`docs/setup/SECRET_MANAGER_SETUP.md`](file:///c:/Users/yuri_/IdeaProjects/learning-infra/docs/setup/SECRET_MANAGER_SETUP.md)

**Added Secret Creation**:

```bash
echo -n "your-cloudflare-zone-id" | \
  gcloud secrets create cloudflare-zone-id \
    --project=vendin-store \
    --data-file=- \
    --labels=environment=production,service=control-plane
```

**Added IAM Binding**:

```bash
gcloud secrets add-iam-policy-binding cloudflare-zone-id \
  --project=vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. [`docs/deployment/CONTROL_PLANE.md`](file:///c:/Users/yuri_/IdeaProjects/learning-infra/docs/deployment/CONTROL_PLANE.md)

**Added to Required GitHub Secrets table**:

- `CLOUDFLARE_ZONE_ID`: Cloudflare Zone ID for vendin.store (for Custom Hostnames)

---

## Complete Environment Variables List

### Required Secrets (via Cloudflare Secrets Store)

| Binding Name           | Secret Name                   | Purpose                      | Usage                            |
| ---------------------- | ----------------------------- | ---------------------------- | -------------------------------- |
| `DATABASE_URL`         | `control-plane-db-url`        | PostgreSQL connection string | Tenant metadata storage          |
| `NEON_API_KEY`         | `neon-api-key`                | Neon API authentication      | Database provisioning            |
| `NEON_PROJECT_ID`      | `neon-project-id`             | Neon project identifier      | Database provisioning            |
| `ADMIN_API_KEY`        | `control-plane-admin-api-key` | API authentication token     | Bearer auth for `/api/tenants/*` |
| `CLOUDFLARE_API_TOKEN` | `cloudflare-api-token`        | Cloudflare API access        | Custom hostname management       |
| `CLOUDFLARE_ZONE_ID`   | `cloudflare-zone-id`          | Zone ID for vendin.store     | Custom hostname management       |

### Environment Variables (via `vars`)

| Variable          | Value                                             | Purpose             |
| ----------------- | ------------------------------------------------- | ------------------- |
| `ALLOWED_ORIGINS` | `"https://vendin.store,https://www.vendin.store"` | CORS configuration  |
| `LOG_LEVEL`       | `"info"`                                          | Logging verbosity   |
| `NODE_ENV`        | `"production"`                                    | Runtime environment |

### GitHub Secrets (for CI/CD)

| Secret                        | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `CLOUDFLARE_API_TOKEN`        | Deploy and manage Workers/Pages        |
| `CLOUDFLARE_ACCOUNT_ID`       | Cloudflare account identifier          |
| `CLOUDFLARE_SECRETS_STORE_ID` | UUID of Secrets Store                  |
| `CLOUDFLARE_ZONE_ID`          | Zone ID (also stored in Secrets Store) |
| `ADMIN_API_KEY`               | Control Plane authentication           |
| `ALLOWED_ORIGINS`             | CORS origins for production            |

---

## 🚨 Critical Issue Identified

### CloudflareProvider Uses `process.env` Directly

**File**: [`apps/control-plane/src/providers/cloudflare/cloudflare.client.ts`](file:///c:/Users/yuri_/IdeaProjects/learning-infra/apps/control-plane/src/providers/cloudflare/cloudflare.client.ts)

**Lines 21-22**:

```typescript
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
```

**Problem**: Cloudflare Workers runtime does **NOT** support `process.env`. Environment variables must be accessed through the `env` binding passed to the `fetch` function.

### Required Fix

The `CloudflareProvider` needs to be refactored to accept credentials via constructor parameters instead of reading from `process.env`:

```typescript
// Before (BROKEN in Workers)
export class CloudflareProvider {
  constructor() {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  }
}

// After (CORRECT for Workers)
export class CloudflareProvider {
  constructor(apiToken: string, zoneId: string) {
    if (!apiToken) {
      throw new Error("CLOUDFLARE_API_TOKEN is required");
    }
    if (!zoneId) {
      throw new Error("CLOUDFLARE_ZONE_ID is required");
    }
    this.client = new Cloudflare({ apiToken });
    this.zoneId = zoneId;
  }
}

// Usage in index.ts
const [
  databaseUrl,
  neonApiKey,
  neonProjectId,
  adminApiKey,
  cloudflareApiToken,
  cloudflareZoneId,
] = await Promise.all([
  resolveSecret(environment.DATABASE_URL),
  resolveSecret(environment.NEON_API_KEY),
  resolveSecret(environment.NEON_PROJECT_ID),
  resolveSecret(environment.ADMIN_API_KEY),
  resolveSecret(environment.CLOUDFLARE_API_TOKEN),
  resolveSecret(environment.CLOUDFLARE_ZONE_ID),
]);

const cloudflareProvider = new CloudflareProvider(
  cloudflareApiToken,
  cloudflareZoneId,
);
```

---

## Setup Checklist

- [ ] Create all secrets in Cloudflare Secrets Store
- [ ] Configure GitHub repository secrets/variables
- [ ] Update `wrangler.jsonc` with Secrets Store ID (replace `STORE_ID_PLACEHOLDER`)
- [ ] Refactor `CloudflareProvider` to accept parameters instead of using `process.env`
- [ ] Update `TenantService` to initialize `CloudflareProvider` with credentials
- [ ] Test deployment with all environment variables properly bound

---

## Related Files

- [`wrangler.jsonc`](file:///c:/Users/yuri_/IdeaProjects/learning-infra/apps/control-plane/wrangler.jsonc)
- [`index.ts`](file:///c:/Users/yuri_/IdeaProjects/learning-infra/apps/control-plane/src/index.ts)
- [`cloudflare.client.ts`](file:///c:/Users/yuri_/IdeaProjects/learning-infra/apps/control-plane/src/providers/cloudflare/cloudflare.client.ts)
- [`SECRET_MANAGER_SETUP.md`](file:///c:/Users/yuri_/IdeaProjects/learning-infra/docs/setup/SECRET_MANAGER_SETUP.md)
- [`CONTROL_PLANE.md`](file:///c:/Users/yuri_/IdeaProjects/learning-infra/docs/deployment/CONTROL_PLANE.md)
