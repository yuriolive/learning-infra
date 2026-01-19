# GCP Infrastructure Setup Guide

## Overview

This directory contains comprehensive step-by-step guides for setting up Google Cloud Platform infrastructure for the learning infrastructure project. All configurations are tailored for the **vendin-store** project.

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

- CDN, DNS management, and security
- WAF, rate limiting, SSL optimization
- **Optional** but recommended for production

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
   - Repository: `your-org/learning-infra`

4. **Domain** (for Cloudflare setup):
   - Registered domain name
   - Access to DNS settings

## Configuration Summary

After setup, you'll need these GitHub secrets:

| Secret                         | Value                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`               | `vendin-store`                                                                                       |
| `GCP_ARTIFACT_REGISTRY_DOMAIN` | `southamerica-east1-docker.pkg.dev`                                                                  |
| `GCP_ARTIFACT_REGISTRY_REPO`   | `containers`                                                                                         |
| `GCP_WIF_PROVIDER`             | `projects/vendin-store/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_WIF_SERVICE_ACCOUNT`      | `[Service account email from WIF setup]`                                                             |

And these GitHub variables (for Gemini features):

| Variable                | Value                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `APP_ID`                | `[Your GitHub App ID]`                                                                               |
| `GOOGLE_CLOUD_LOCATION` | `southamerica-east1`                                                                                 |
| `GOOGLE_CLOUD_PROJECT`  | `vendin-store`                                                                                       |
| `SERVICE_ACCOUNT_EMAIL` | `[Service account email from WIF setup]`                                                             |
| `GCP_WIF_PROVIDER`      | `projects/vendin-store/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |

## Architecture

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
   curl https://api.vendin.store/health
   ```

## Troubleshooting

### Common Issues

1. **WIF Authentication fails**
   - Check GitHub org/username in step 8 of WIF setup
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
    ├── README.md                    # This file - main guide
    ├── GCP_INFRASTRUCTURE_SETUP.md  # Quick reference for experts
    ├── WIF_SETUP.md                 # Workload Identity Federation
    ├── ARTIFACT_REGISTRY_SETUP.md   # Container registry
    ├── SECRET_MANAGER_SETUP.md      # Secret management
    ├── CLOUD_RUN_SETUP.md           # Container deployment
    └── CLOUDFLARE_SETUP.md          # CDN and security
```

## Support

For issues with this setup:

1. Check the individual setup guides for component-specific troubleshooting
2. Verify all prerequisites are met
3. Test with minimal configuration first
4. Check GCP and GitHub Action logs for errors

## Next Steps

1. Run all setup commands in order
2. Configure GitHub secrets and variables
3. Update database URL secret with real credentials
4. Test deployment workflow
5. Set up monitoring and alerts
6. Configure backup and failover if needed
