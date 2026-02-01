# GCP Infrastructure Setup Guide

## Overview

This directory contains comprehensive step-by-step guides for setting up Google Cloud Platform infrastructure for the Vendin project. All configurations are tailored for the **vendin-store** project.

## Setup Order

Follow these steps in sequence for a complete infrastructure setup:

### 1. **Workload Identity Federation** (`WIF_SETUP.md`)

**Time: 10-15 minutes**

- Secure authentication between GitHub Actions and GCP
- Eliminates need for long-lived service account keys
- **Required** for all other GCP operations

### 2. **Artifact Registry** (`ARTIFACT_REGISTRY_SETUP.md`)

**Time: 5-10 minutes**

- Container image storage and management
- Stores Docker images for deployments
- **Required** before deploying to Cloud Run

### 3. **Secret Manager** (`SECRET_MANAGER_SETUP.md`)

**Time: 5-10 minutes**

- Secure storage for database credentials and API keys
- Encrypted secrets with access controls
- **Required** for database connections

### 4. **Cloud Run** (`CLOUD_RUN_SETUP.md`)

**Time: 10-15 minutes**

- Serverless container deployment service
- Auto-scaling and SSL termination
- **Required** for application hosting

### 5. **Cloudflare** (`CLOUDFLARE_SETUP.md`)

**Time: 15-30 minutes**

- Marketing app deployment (Cloudflare Pages - root domain)
- Storefront router deployment (Cloudflare Pages - tenant domains)
- Cloudflare for SaaS setup (custom domains)
- DNS, SSL automation, and security
- WAF, rate limiting
- **Required** for marketing site, storefront routing, and custom domain support

### 6. **Tenant Provisioning** (`TENANT_PROVISIONING_SETUP.md`)

**Time: Read-only (implementation guide)**

- End-to-end provisioning workflow
- Database and compute resource creation
- Custom domain management
- Error handling and rollback
- **Reference** for Control Plane implementation

## Quick Start

For experienced users, see `GCP_INFRASTRUCTURE_SETUP.md` for condensed commands.

## Prerequisites

Before starting:

1. **Google Cloud CLI** installed and authenticated:

   ```bash
   gcloud auth login
   gcloud config set project vendin-store
   ```

2. **Required GCP Permissions**:
   - `roles/owner` or equivalent on the `vendin-store` project
   - Ability to create service accounts and manage IAM
   - Access to enable GCP APIs

3. **GitHub Repository Access**:
   - Admin access to configure secrets and variables
   - Repository: `yuriolive/vendin`

4. **Domain** (for Cloudflare setup):
   - Registered domain name
   - Access to DNS settings

## Configuration Summary

After setup, you'll need these GitHub secrets:

| Secret                         | Value                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`               | `vendin-store`                                                                                           |
| `GCP_ARTIFACT_REGISTRY_DOMAIN` | `southamerica-east1-docker.pkg.dev`                                                                      |
| `GCP_ARTIFACT_REGISTRY_REPO`   | `containers`                                                                                             |
| `GCP_WIF_PROVIDER`             | `projects/[PROJECT_NUMBER]/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_WIF_SERVICE_ACCOUNT`      | `github-actions-sa@vendin-store.iam.gserviceaccount.com`                                                 |
| `NEON_API_KEY`                 | Your Neon API Key (stored in Secret Manager as `neon-api-key`)                                           |
| `NEON_PROJECT_ID`              | Your Neon Project ID (stored in Secret Manager as `neon-project-id`)                                     |

**Note**: The provider value will contain your GCP **Project Number** (e.g., `110781160918`) instead of the Project ID. This is normal.

And these GitHub variables (for Gemini features):

| Variable                | Value                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `APP_ID`                | `[Your GitHub App ID]`                                                                               |
| `GOOGLE_CLOUD_LOCATION` | `southamerica-east1`                                                                                 |
| `GOOGLE_CLOUD_PROJECT`  | `vendin-store`                                                                                       |
| `SERVICE_ACCOUNT_EMAIL` | `[Service account email from WIF setup]`                                                             |
| `GCP_WIF_PROVIDER`      | `projects/vendin-store/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |

## Architecture

### Infrastructure Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Actions │───▶│ Workload Identity │───▶│   GCP Services   │
│   (OIDC Token)   │    │    Federation     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Artifact Registry│    │  Secret Manager   │    │   Cloud Run     │
│   (Containers)   │    │  (Credentials)    │    │  (Deployment)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloudflare     │    │     Domain       │    │     Users       │
│   (CDN/Security) │    │   (DNS/SSL)      │    │   (Access)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Subdomain Structure

```
vendin.store                    → Marketing app (landing page & signup)
www.vendin.store                → Redirects to root
control.vendin.store            → Control Plane API
admin.vendin.store              → Platform admin dashboard (optional)
*-my.vendin.store               → Tenant stores (wildcard)
  ├─ awesome-store-my.vendin.store → Tenant storefront UI (served by tenant instance)
  └─ awesome-store-my.vendin.store/admin → Tenant admin (MedusaJS)
```

**Pattern:** Using `-my.vendin.store` (hyphenated) for SSL coverage. Planned migration to `.my.vendin.store` once Cloudflare deep wildcard SSL is enabled.

### Multi-Tenant Request Flow

**Landing/Signup (Root Domain):**

```
Customer → vendin.store
        → Marketing app (Cloudflare Pages)
        → Landing page, signup form, marketing
```

**Tenant Store (Subdomain or Custom Domain):**

```
Customer → merchant-name-my.vendin.store OR shop.merchant.com
        → Cloudflare (DNS + SSL + CDN)
        → Storefront router (Cloudflare Pages - Next.js)
        → Resolves tenant from hostname (-my pattern or custom domain)
        → Redirect/proxy to tenant-{id} (Cloud Run)
        → Tenant instance serves custom storefront UI + APIs
        → Tenant Database (Neon PostgreSQL)
```

### Service Architecture

**Shared Services:**

- **Control Plane** (Cloud Run): Single shared service managing all tenants
- **Marketing App** (Cloudflare Pages): Landing page on root domain
- **Storefront Router** (Cloudflare Pages): Router-only app for tenant domains
- **Redis** (Upstash): Shared instance with tenant namespacing

**Per-Tenant Services:**

- **Tenant Instance** (Cloud Run): One MedusaJS instance per tenant (`tenant-{id}`)
  - Serves custom storefront UI (per-tenant themes/customizations)
  - Serves MedusaJS Store API and Admin UI
- **Database** (Neon): One PostgreSQL database per tenant
- **Custom Domain** (Cloudflare): Optional custom hostname per tenant

## Cost Estimation

### Free Tier (Monthly)

- Workload Identity Federation: **Free**
- Secret Manager: 6 versions **Free**
- Cloud Run: 2M requests **Free**
- Artifact Registry: 500MB storage **Free**
- Cloudflare: Basic features **Free**

### Estimated Paid Usage

- Cloud Run: **$10-50/month** (depending on traffic)
- Artifact Registry: **$1-5/month** (storage)
- Secret Manager: **$1-2/month** (additional versions)
- Cloudflare: **Free to $20/month** (depending on plan)

## Testing Setup

After completing all steps:

1. **Push to main branch** to trigger deployment
2. **Check GitHub Actions logs** for any errors
3. **Verify Cloud Run service** is running:
   ```bash
   gcloud run services list --project=vendin-store --region=southamerica-east1
   ```
4. **Test the endpoint** (if domain configured):
   ```bash
   curl https://control.vendin.store/health
   ```

## Troubleshooting

### Common Issues

1. **WIF Authentication fails**
   - Check GitHub org/username in step 8 of WIF setup (should be `yuriolive`)
   - Verify service account email in GitHub secrets

2. **Artifact Registry push fails**
   - Ensure Docker authentication: `gcloud auth configure-docker`
   - Check service account permissions

3. **Secret access fails**
   - Verify secret exists: `gcloud secrets list`
   - Check service account has `secretmanager.secretAccessor`

4. **Cloud Run deployment fails**
   - Check image exists in registry
   - Verify region matches (southamerica-east1)

5. **Domain not working**
   - Wait for DNS propagation (24-48 hours)
   - Check domain mapping status

6. **Workflows service agent does not exist**
   - **Error**: `FAILED_PRECONDITION` during workflow deployment.
   - **Fix**: See manual fix in [GCP_INFRASTRUCTURE_SETUP.md](./GCP_INFRASTRUCTURE_SETUP.md#L43).

7. **Workflows Permission Denied (ActAs)**
   - **Error**: `PERMISSION_DENIED: permission iam.serviceAccounts.ActAs is required`
   - **Fix**: See manual fix in [GCP_INFRASTRUCTURE_SETUP.md](./GCP_INFRASTRUCTURE_SETUP.md#L48).

### Diagnostic Commands

```bash
# Check all services
gcloud services list --project=vendin-store --filter="state:ENABLED"

# Verify service account
gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=vendin-store

# Check workload identity
gcloud iam workload-identity-pools describe github-pool --project=vendin-store --location=global

# List artifacts
gcloud artifacts repositories list --project=vendin-store --location=southamerica-east1

# Check secrets
gcloud secrets list --project=vendin-store

# Check Cloud Run services
gcloud run services list --project=vendin-store --region=southamerica-east1
```

## Security Checklist

- [ ] WIF properly configured (no long-lived keys)
- [ ] Service account follows principle of least privilege
- [ ] Secrets encrypted and access controlled
- [ ] Cloud Run allows only necessary unauthenticated access
- [ ] Domain SSL properly configured
- [ ] WAF and rate limiting enabled (Cloudflare)

## File Structure

```
docs/
└── setup/
    ├── README.md                      # This file - main guide
    ├── GCP_INFRASTRUCTURE_SETUP.md    # Quick reference for experts
    ├── WIF_SETUP.md                   # Workload Identity Federation
    ├── ARTIFACT_REGISTRY_SETUP.md     # Container registry
    ├── SECRET_MANAGER_SETUP.md        # Secret management
    ├── CLOUD_RUN_SETUP.md             # Container deployment (Control Plane + Tenant Instances)
    ├── CLOUDFLARE_SETUP.md            # Storefront + Cloudflare for SaaS
    └── TENANT_PROVISIONING_SETUP.md   # End-to-end provisioning workflow
```

## Support

For issues with this setup:

1. Check the individual setup guides for component-specific troubleshooting
2. Verify all prerequisites are met
3. Test with minimal configuration first
4. Check GCP and GitHub Action logs for errors

## Next Steps

1. Run all setup commands in order (Steps 1-5)
2. Configure GitHub secrets and variables
3. Update database URL secret with real credentials
4. Test Control Plane deployment
5. Test Storefront deployment to Cloudflare Pages
6. Review Tenant Provisioning guide for implementation reference
7. Set up monitoring and alerts
8. Test end-to-end tenant provisioning flow
