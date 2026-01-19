# GCP Infrastructure Setup Guide

## Overview

This is the main setup guide for the learning infrastructure project. It provides a complete overview of all GCP components needed for deployment.

## Setup Order

Follow these steps in order:

1. **Workload Identity Federation** (`WIF_SETUP.md`)
2. **Artifact Registry** (`ARTIFACT_REGISTRY_SETUP.md`)
3. **Secret Manager** (`SECRET_MANAGER_SETUP.md`)
4. **Cloud Run** (`CLOUD_RUN_SETUP.md`)
5. **Cloudflare** (`CLOUDFLARE_SETUP.md`) - Optional but recommended

## Quick Setup Commands

For experienced users, here are all the essential commands in sequence:

```bash
# 1. Enable APIs
gcloud services enable iamcredentials.googleapis.com --project=vendin-store
gcloud services enable artifactregistry.googleapis.com --project=vendin-store
gcloud services enable secretmanager.googleapis.com --project=vendin-store
gcloud services enable run.googleapis.com --project=vendin-store

# 2. Create Service Account
gcloud iam service-accounts create github-actions-sa \
  --project=vendin-store \
  --description="GitHub Actions service account" \
  --display-name="GitHub Actions SA"

SERVICE_ACCOUNT_EMAIL=$(gcloud iam service-accounts list \
  --project=vendin-store \
  --filter="displayName:GitHub Actions SA" \
  --format="value(email)")

# 3. Grant Permissions
gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/cloudrun.admin"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/iam.workloadIdentityUser"

# 4. Create Workload Identity Pool and Provider
gcloud iam workload-identity-pools create "github-pool" \
  --project="vendin-store" \
  --location="global" \
  --description="GitHub Actions identity pool" \
  --display-name="GitHub Pool"

POOL_ID=$(gcloud iam workload-identity-pools describe "github-pool" \
  --project="vendin-store" \
  --location="global" \
  --format="value(name)")

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="vendin-store" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub provider" \
  --description="OIDC provider for GitHub Actions" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository_owner == 'yuriolive'"

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --project="vendin-store" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/$POOL_ID/attribute.repository/yuriolive/learning-infra"

# 5. Create Artifact Registry
gcloud artifacts repositories create containers \
  --project="vendin-store" \
  --repository-format=docker \
  --location=southamerica-east1 \
  --description="Container images for learning infrastructure"

gcloud artifacts repositories add-iam-policy-binding containers \
  --project="vendin-store" \
  --location=southamerica-east1 \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.writer"

# 6. Create Database Secret
echo -n "postgresql://username:password@hostname:5432/database" | \
  gcloud secrets create control-plane-db-url \
    --project="vendin-store" \
    --data-file=- \
    --labels=environment=production,service=control-plane

gcloud secrets add-iam-policy-binding control-plane-db-url \
  --project="vendin-store" \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

## Required GitHub Secrets

After running the setup commands, configure these GitHub secrets:

```
GCP_PROJECT_ID = vendin-store
GCP_ARTIFACT_REGISTRY_DOMAIN = southamerica-east1-docker.pkg.dev
GCP_ARTIFACT_REGISTRY_REPO = containers
GCP_WIF_PROVIDER = projects/vendin-store/locations/global/workloadIdentityPools/github-pool/providers/github-provider
GCP_WIF_SERVICE_ACCOUNT = [SERVICE_ACCOUNT_EMAIL from step 2]
```

## Required GitHub Variables (for Gemini features)

```
APP_ID = [Your GitHub App ID]
GOOGLE_CLOUD_LOCATION = southamerica-east1
GOOGLE_CLOUD_PROJECT = vendin-store
SERVICE_ACCOUNT_EMAIL = [SERVICE_ACCOUNT_EMAIL from step 2]
GCP_WIF_PROVIDER = projects/vendin-store/locations/global/workloadIdentityPools/github-pool/providers/github-provider
GEMINI_CLI_VERSION = latest
GEMINI_MODEL = gemini-1.5-flash-002
GOOGLE_GENAI_USE_GCA = false
GOOGLE_GENAI_USE_VERTEXAI = true
DEBUG = false
```

## Architecture Overview

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

## Component Descriptions

### Workload Identity Federation (WIF)

- **Purpose**: Secure authentication from GitHub Actions to GCP
- **Why needed**: Eliminates long-lived service account keys
- **Security**: Uses short-lived OIDC tokens

### Artifact Registry

- **Purpose**: Store and manage container images
- **Location**: `southamerica-east1-docker.pkg.dev`
- **Repository**: `containers`
- **Access**: Via service account with write permissions

### Secret Manager

- **Purpose**: Securely store sensitive configuration
- **Secrets**: Database URLs, API keys, JWT secrets
- **Access**: Encrypted at rest, accessed via service account

### Cloud Run

- **Purpose**: Serverless container deployment
- **Scaling**: 0-10 instances, 1 CPU, 512MB RAM
- **Domain**: Custom domain mapping with SSL
- **Secrets**: Injected as environment variables

### Cloudflare (Optional)

- **Purpose**: CDN, DNS, security, and performance
- **Features**: WAF, rate limiting, SSL termination
- **Domain**: `api.vendin.store` → Cloud Run

## Cost Estimation

### Free Tier

- Workload Identity Federation: Free
- Secret Manager: 6 versions free/month
- Cloud Run: 2 million requests free/month
- Artifact Registry: 500MB free storage
- Cloudflare: Basic features free

### Paid Usage (Estimated)

- Cloud Run: ~$10-50/month (depending on traffic)
- Artifact Registry: ~$1-5/month (storage)
- Secret Manager: ~$1-2/month (additional versions)
- Cloudflare: Free to $20/month (depending on plan)

## Troubleshooting

### Common Issues

1. **WIF Authentication fails**
   - Check GitHub org/username in step 8
   - Verify service account email in secrets

2. **Artifact Registry push fails**
   - Ensure Docker is authenticated: `gcloud auth configure-docker`
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

### Useful Diagnostic Commands

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

## Next Steps

1. Run all setup commands in order
2. Configure GitHub secrets and variables
3. Update database URL secret with real credentials
4. Test deployment workflow
5. Set up monitoring and alerts
6. Configure Cloudflare (optional but recommended)

## Support

For issues with this setup:

1. Check the individual setup guides for component-specific troubleshooting
2. Verify all prerequisites are met
3. Test with minimal configuration first
4. Check GCP and GitHub Action logs for errors

## File Structure

```
learning-infra/
├── GCP_INFRASTRUCTURE_SETUP.md     # This file - main overview
├── WIF_SETUP.md                     # Workload Identity Federation
├── ARTIFACT_REGISTRY_SETUP.md       # Container registry
├── SECRET_MANAGER_SETUP.md          # Secret management
├── CLOUD_RUN_SETUP.md               # Container deployment
├── CLOUDFLARE_SETUP.md              # CDN and security (optional)
└── .github/
    └── workflows/
        ├── ci.yml                   # Build and test
        └── deploy.yml               # Deployment workflow
```
