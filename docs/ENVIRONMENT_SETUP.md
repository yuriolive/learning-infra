# Environment Variables & Secrets - MVP Setup Guide

**Last Updated**: 2026-01-24  
**Status**: ✅ Active - MVP Phase

## Overview

This document consolidates all environment variable and secrets management for the Control Plane application during the MVP phase. It covers Cloudflare Workers configuration, secrets storage, and deployment setup.

---

## Quick Reference

### Control Plane Environment Variables

| Variable                         | Type      | Source           | Purpose                                                        |
| -------------------------------- | --------- | ---------------- | -------------------------------------------------------------- |
| `DATABASE_URL`                   | Secret    | Secrets Store    | PostgreSQL connection string                                   |
| `NEON_API_KEY`                   | Secret    | Secrets Store    | Neon API authentication                                        |
| `NEON_PROJECT_ID`                | Secret    | Secrets Store    | Neon project identifier                                        |
| `GEMINI_API_KEY`                 | Secret    | Secrets Store    | Gemini API Key for AI assistance                               |
| `ADMIN_API_KEY`                  | Secret    | Secrets Store    | API authentication (Bearer)                                    |
| `INTERNAL_API_KEY`               | Secret    | Secrets Store    | Internal API authentication                                    |
| `CLOUDFLARE_API_TOKEN`           | Secret    | Secrets Store    | Cloudflare API access                                          |
| `CLOUDFLARE_ZONE_ID`             | Secret    | Secrets Store    | Zone ID for vendin.store                                       |
| `TENANT_BASE_DOMAIN`             | Plain Var | `wrangler.jsonc` | Base domain for tenant subdomains (e.g., vendin.store)         |
| `ALLOWED_ORIGINS`                | Plain Var | `wrangler.jsonc` | CORS allowed origins                                           |
| `LOG_LEVEL`                      | Plain Var | `wrangler.jsonc` | Logging verbosity (info/debug)                                 |
| `NODE_ENV`                       | Plain Var | `wrangler.jsonc` | Runtime environment (production)                               |
| `POSTHOG_API_KEY`                | Secret    | Secrets Store    | PostHog project API key                                        |
| `POSTHOG_HOST`                   | Plain Var | `wrangler.jsonc` | PostHog API host                                               |
| `UPSTASH_REDIS_URL`              | Secret    | Secrets Store    | Redis connection string                                        |
| `GOOGLE_APPLICATION_CREDENTIALS` | Secret    | Secrets Store    | GCP Service Account credentials (assembled from parts)         |
| `GCP_PROJECT_ID`                 | Plain Var | `wrangler.jsonc` | Google Cloud Project ID                                        |
| `GCP_REGION`                     | Plain Var | `wrangler.jsonc` | Google Cloud Region (southamerica-east1)                       |
| `REDIS_PREFIX`                   | Plain Var | Dynamic          | Prefix for Redis keys (namespacing for multi-tenancy)          |
| `TENANT_IMAGE_TAG`               | Plain Var | `wrangler.jsonc` | Docker image tag for tenant (dynamically constructed in CI/CD) |

---

## Step 1: Generate Secrets

### 1.1 Generate Admin API Key

```bash
# Generate a secure random API key
openssl rand -base64 32
```

### 1.1b Generate Internal API Key

```bash
# Generate a secure random Internal API key
openssl rand -base64 32

```

Save this value - you'll need it for both Cloudflare Secrets Store and GitHub Secrets.

### 1.2 Get Required Values

- **DATABASE_URL**: Neon PostgreSQL connection string
- **NEON_API_KEY**: From [Neon Console](https://console.neon.tech) → Account Settings → API Keys
- **NEON_PROJECT_ID**: From Neon project URL or dashboard
- **GEMINI_API_KEY**: From [Google AI Studio](https://aistudio.google.com/app/apikey)
- **CLOUDFLARE_API_TOKEN**: Create at [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
  - Required permissions:
    - **Account**: **D1 (Edit)** - Required for D1 database migrations
    - **Workers Scripts (Edit)** - Required for deploying Workers
    - **Workers Secrets (Edit)** - Required for managing Worker secrets
- **CLOUDFLARE_ZONE_ID**: From Cloudflare dashboard → vendin.store → Overview → Zone ID
- **POSTHOG_API_KEY**: From PostHog Dashboard → Project Settings → Project API Key
- **POSTHOG_HOST**: Use `https://us.i.posthog.com` for US Cloud or `https://eu.i.posthog.com` for EU.
- **UPSTASH_REDIS_URL**: From [Upstash Console](https://console.upstash.com) (Redis Connection String)
- **GOOGLE_APPLICATION_CREDENTIALS**: JSON key file content for GCP Service Account (minified)
- **GCP_PROJECT_ID**: Your Google Cloud Project ID
- **GCP_REGION**: e.g., `us-central1`
- **TENANT_IMAGE_TAG**: Full Docker image path (e.g., `europe-docker.pkg.dev/...`)

---

## Step 2: Setup Cloudflare Secrets Store

### 2.1 Create Secrets Store

```bash
# Create a new Secrets Store for Control Plane
pnpm wrangler secrets-store create control-plane-secrets

# Copy the UUID that's returned - you'll need it for wrangler.jsonc
```

### 2.2 Add Secrets to Store

```bash
# Set the Secrets Store ID (replace with your actual UUID)
export SECRETS_STORE_ID="your-secrets-store-uuid-here"

# Add each secret
echo -n "postgresql://user:pass@host:5432/db" | pnpm wrangler secrets-store secret put control-plane-db-url --secrets-store-id=$SECRETS_STORE_ID
echo -n "your-neon-api-key" | pnpm wrangler secrets-store secret put neon-api-key --secrets-store-id=$SECRETS_STORE_ID
echo -n "your-neon-project-id" | pnpm wrangler secrets-store secret put neon-project-id --secrets-store-id=$SECRETS_STORE_ID
echo -n "your-gemini-api-key" | pnpm wrangler secrets-store secret put gemini-api-key --secrets-store-id=$SECRETS_STORE_ID
echo -n "$(openssl rand -base64 32)" | pnpm wrangler secrets-store secret put control-plane-admin-api-key --secrets-store-id=$SECRETS_STORE_ID
echo -n "$(openssl rand -base64 32)" | pnpm wrangler secrets-store secret put internal-api-key --secrets-store-id=$SECRETS_STORE_ID
echo -n "your-cloudflare-api-token" | pnpm wrangler secrets-store secret put cloudflare-api-token --secrets-store-id=$SECRETS_STORE_ID
echo -n "your-cloudflare-zone-id" | pnpm wrangler secrets-store secret put cloudflare-zone-id --secrets-store-id=$SECRETS_STORE_ID
echo -n "your-posthog-api-key" | pnpm wrangler secrets-store secret put posthog-api-key --secrets-store-id=$SECRETS_STORE_ID
echo -n "your-upstash-redis-url" | pnpm wrangler secrets-store secret put upstash-redis-url --secrets-store-id=$SECRETS_STORE_ID
echo -n "your-google-creds-json" | pnpm wrangler secrets-store secret put google-application-credentials --secrets-store-id=$SECRETS_STORE_ID
```

### 2.3 Verify Secrets

```bash
# List all secrets in the store
pnpm wrangler secrets-store secret list --secrets-store-id=$SECRETS_STORE_ID
```

---

## Step 3: Configure wrangler.jsonc

Update `apps/control-plane/wrangler.jsonc`:

```jsonc
{
  "name": "control-plane",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",

  // Replace STORE_ID_PLACEHOLDER with your actual Secrets Store UUID
  "secrets_store": {
    "binding": "SECRETS_STORE_ID_PLACEHOLDER",
    "secrets": [
      { "binding": "DATABASE_URL", "name": "control-plane-db-url" },
      { "binding": "NEON_API_KEY", "name": "neon-api-key" },
      { "binding": "NEON_PROJECT_ID", "name": "neon-project-id" },
      { "binding": "GEMINI_API_KEY", "name": "gemini-api-key" },
      { "binding": "ADMIN_API_KEY", "name": "control-plane-admin-api-key" },
      { "binding": "INTERNAL_API_KEY", "name": "internal-api-key" },
      { "binding": "CLOUDFLARE_API_TOKEN", "name": "cloudflare-api-token" },
      { "binding": "CLOUDFLARE_ZONE_ID", "name": "cloudflare-zone-id" },
      { "binding": "POSTHOG_API_KEY", "name": "posthog-api-key" },
      { "binding": "UPSTASH_REDIS_URL", "name": "upstash-redis-url" },
      {
        "binding": "GOOGLE_APPLICATION_CREDENTIALS",
        "name": "google-application-credentials",
      },
    ],
  },

  "vars": {
    "ALLOWED_ORIGINS": "https://vendin.store,https://www.vendin.store",
    "LOG_LEVEL": "info",
    "NODE_ENV": "production",
    "POSTHOG_HOST": "https://us.i.posthog.com",
    "GCP_PROJECT_ID": "VALUE_PLACEHOLDER",
    "GCP_REGION": "us-central1",
    "TENANT_IMAGE_TAG": "europe-docker.pkg.dev/VALUE_PLACEHOLDER/repo/tenant-instance:latest",
    "TENANT_BASE_DOMAIN": "vendin.store",
  },
}
```

---

## Step 4: Configure GitHub Secrets

For CI/CD deployment, add these to your GitHub repository settings (Settings → Secrets and variables → Actions):

### GitHub Secrets

| Secret Name                   | Value                       | Purpose                       |
| ----------------------------- | --------------------------- | ----------------------------- |
| `CLOUDFLARE_API_TOKEN`        | Your Cloudflare API token   | Deploy Workers                |
| `CLOUDFLARE_ACCOUNT_ID`       | Your Cloudflare account ID  | Account identification        |
| `CLOUDFLARE_SECRETS_STORE_ID` | UUID from Step 2.1          | Access Secrets Store in CI    |
| `ADMIN_API_KEY`               | Admin API key from Step 1.1 | Testing API in CI (if needed) |
| `NEXT_PUBLIC_POSTHOG_KEY`     | PostHog project API key     | Analytics integration         |

### GitHub Variables

| Variable Name              | Value                                           | Purpose                  |
| -------------------------- | ----------------------------------------------- | ------------------------ |
| `ALLOWED_ORIGINS`          | `https://vendin.store,https://www.vendin.store` | Production CORS          |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com`                      | PostHog Ingestion Sector |

---

## Step 5: Local Development

### 5.1 Create `.dev.vars` (Local Only)

Create `apps/control-plane/.dev.vars` for local development:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/control_plane_dev"
NEON_API_KEY="your-neon-api-key"
NEON_PROJECT_ID="your-neon-project-id"
GEMINI_API_KEY="your-gemini-api-key"
ADMIN_API_KEY="dev-api-key-change-me"
INTERNAL_API_KEY="dev-internal-api-key-change-me"
CLOUDFLARE_API_TOKEN="your-cloudflare-token"
CLOUDFLARE_ZONE_ID="your-zone-id"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
LOG_LEVEL="debug"
NODE_ENV="development"
POSTHOG_API_KEY="your-posthog-api-key"
POSTHOG_HOST="https://us.i.posthog.com"
NEXT_PUBLIC_POSTHOG_KEY="your-posthog-api-key"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
UPSTASH_REDIS_URL="redis://default:token@region.upstash.io:port"
GOOGLE_APPLICATION_CREDENTIALS="{}"
GCP_PROJECT_ID="your-gcp-project-id"
GCP_REGION="us-central1"
TENANT_IMAGE_TAG="europe-docker.pkg.dev/project/repo/tenant-instance:latest"
TENANT_BASE_DOMAIN="vendin.store"
```

> ⚠️ **Important**: `.dev.vars` is gitignored. Never commit secrets to version control.

### 5.2 Run Locally

For comprehensive local development instructions (including Postgres, Redis, and multi-app setup), please see the [Local Development Guide](local-development.md).

---

## Step 6: Deploy

### Local Deployment

```bash
# From project root
pnpm run deploy:control-plane

# Or from apps/control-plane
cd apps/control-plane
pnpm run deploy
```

### CI/CD Deployment

Push to `main` branch - the GitHub Actions workflow will automatically deploy if changes are detected in:

- `apps/control-plane/**`
- Shared packages
- Root configuration

---

## Usage Examples

### API Authentication

All requests to `/api/tenants/*` require the Admin API key:

```bash
# Get admin API key from Secrets Store
ADMIN_KEY=$(pnpm wrangler secrets-store secret get control-plane-admin-api-key --secrets-store-id=$SECRETS_STORE_ID)

# Make authenticated request
curl -H "Authorization: Bearer $ADMIN_KEY" \
  https://control.vendin.store/api/tenants
```

### Generate New Admin API Key

```bash
# Generate new key
NEW_KEY=$(openssl rand -base64 32)

# Update in Secrets Store
echo -n "$NEW_KEY" | pnpm wrangler secrets-store secret put control-plane-admin-api-key --secrets-store-id=$SECRETS_STORE_ID

# Update GitHub Secret (manual via UI or GitHub CLI)
gh secret set ADMIN_API_KEY --body "$NEW_KEY"
```

---

## Troubleshooting

### Common Issues

**"Secret not found" error during deployment**

- Verify Secrets Store ID in `wrangler.jsonc` is correct
- Check secret names match exactly (case-sensitive)
- Run `pnpm wrangler secrets-store secret list` to verify secrets exist

**"Unauthorized" when calling API**

- Verify `Authorization: Bearer <token>` header is present
- Check token matches the value in Secrets Store
- Use `constant-time comparison` is working (timing attack prevention)

**CORS errors in browser**

- Verify `ALLOWED_ORIGINS` includes the requesting origin
- Check origin doesn't have trailing slash
- Ensure `NODE_ENV` is set correctly

**"process is not defined" error**

- This means code is trying to use `process.env` directly
- All env vars must be accessed through the `env` binding in Cloudflare Workers
- See code examples in `apps/control-plane/src/index.ts`

**\"Authentication error\" during D1 migrations**

```
✘ [ERROR] Authentication error [code: 10000]
✘ [ERROR] Unable to authenticate request [code: 10001]
```

- The Cloudflare API token is missing **D1 (Edit)** permission
- Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
- Edit the token and ensure **Account** → **D1** → **Edit** permission is enabled
- Update the token value in GitHub Secrets (`CLOUDFLARE_API_TOKEN`)

---

## Security Best Practices

1. **Rotate Secrets Regularly**: Change API keys every 90 days
2. **Use Strong Keys**: Always use `openssl rand -base64 32` or equivalent
3. **Limit Access**: Only grant necessary permissions to service accounts
4. **Monitor Usage**: Check Cloudflare Analytics for unusual access patterns
5. **Never Commit Secrets**: Always use `.dev.vars` for local development

---

## Related Files

- [`apps/control-plane/wrangler.jsonc`](../../apps/control-plane/wrangler.jsonc) - Worker configuration
- [`apps/control-plane/src/index.ts`](../../apps/control-plane/src/index.ts) - Environment binding usage
- [`apps/control-plane/src/middleware.ts`](../../apps/control-plane/src/middleware.ts) - Authentication logic
- [`.github/workflows/deploy-control-plane.yml`](../../.github/workflows/deploy-control-plane.yml) - CI/CD workflow
