# GCP Infrastructure Setup for Vendin

## Overview

This document serves as the **Single Source of Truth** for setting up the Google Cloud Platform (GCP) infrastructure for the Vendin e-commerce platform. It consolidates setup instructions for:

1.  **Workload Identity Federation (WIF)**: Secure GitHub Actions authentication.
2.  **Artifact Registry**: Container image storage.
3.  **Secret Manager**: Secure credential management.
4.  **Cloud Run**: Serverless compute for Control Plane and Tenants.

---

## Part 1: Quick Setup Script (Run & Done)

Use this script to provision the core infrastructure in one go.

**Prerequisites:**

- `gcloud` installed and authenticated (`gcloud auth login`)
- Project created: `vendin-store`
- You are owner/editor of the project

```bash
# 1. Set environment variables
export PROJECT_ID="vendin-store"
export REGION="southamerica-east1"
export GITHUB_REPO="yuriolive/vendin" # Format: username/repo
export SERVICE_ACCOUNT_EMAIL="github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# 2. Enable Required APIs (Order matters!)
gcloud services enable \
  iamcredentials.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  run.googleapis.com \
  compute.googleapis.com \
  cloudresourcemanager.googleapis.com \
  workflows.googleapis.com \
  --project=$PROJECT_ID

# 3. Initialize Service Agents
# Required for Workflows to avoid FAILED_PRECONDITION errors
gcloud beta services identity create --service=workflows.googleapis.com --project=$PROJECT_ID

# 4. Create GitHub Actions Service Account
gcloud iam service-accounts create github-actions-sa \
  --project=$PROJECT_ID \
  --description="GitHub Actions Service Account" \
  --display-name="GitHub Actions SA"

# 5. Create Artifact Registry

# 6. Create Artifact Registry
gcloud artifacts repositories create containers \
  --project=$PROJECT_ID \
  --repository-format=docker \
  --location=$REGION \
  --description="Container images for Vendin"

# 7. Grant Permissions to GitHub Actions SA
# Artifact Registry Writer
gcloud artifacts repositories add-iam-policy-binding containers \
  --project=$PROJECT_ID \
  --location=$REGION \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.writer"

# Cloud Run Admin (to deploy services)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/run.admin"

# Secret Manager Access (to manage secrets during deploy if needed)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# Service Account User (to act as runtime SAs)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/iam.serviceAccountUser"

# 8. Configure Workload Identity Federation (WIF)
# Create Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project=$PROJECT_ID \
  --location="global" \
  --display-name="GitHub Pool"

# Get Pool ID
export POOL_ID=$(gcloud iam workload-identity-pools describe "github-pool" \
  --project=$PROJECT_ID \
  --location="global" \
  --format="value(name)")

# Create Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_REPO%%/*}'"

# Allow GitHub Actions to impersonate the SA
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${GITHUB_REPO}"

# 9. Create Runtime Service Accounts

# 9a. Cloud Run Service Account (Tenant Runtime)
gcloud iam service-accounts create cloud-run-sa \
  --project=$PROJECT_ID \
  --description="Cloud Run runtime service account for MedusaJS tenants" \
  --display-name="Tenant Runtime SA"

# 9b. Control Plane Service Account (Control Plane + Workflows Identity)
gcloud iam service-accounts create control-plane-sa \
  --project=$PROJECT_ID \
  --description="Control Plane Service Account" \
  --display-name="Control Plane SA"

export RUNTIME_SA_EMAIL="control-plane-sa@${PROJECT_ID}.iam.gserviceaccount.com"
export WORKFLOWS_SA_EMAIL="service-$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@gcp-sa-workflows.iam.gserviceaccount.com"

# 10. Grant Runtime Permissions

# Control Plane needs to manage Cloud Run
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:control-plane-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Control Plane needs to pass permissions to cloud-run-sa
gcloud iam service-accounts add-iam-policy-binding cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --project=$PROJECT_ID \
  --member="serviceAccount:control-plane-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Tenants need log/metric writing
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/monitoring.metricWriter"

# Tenants need to pull images
gcloud artifacts repositories add-iam-policy-binding containers \
  --project=$PROJECT_ID \
  --location=$REGION \
  --member="serviceAccount:cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# 11. Grant Workflow & Service Invocation Permissions

# Control Plane needs to trigger Workflows
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA_EMAIL" \
  --role="roles/workflows.invoker"

# Allow Cloud Run SA (Workflows identity) to invoke Cloud Run services
# (This is needed if the workflow invokes the Cloud Run service directly)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# 12. Configure OIDC & ActAs Permissions (Crucial for Workflows)
# Allow Control Plane SA to create OIDC tokens (required for auth: type: OIDC)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA_EMAIL" \
  --role="roles/iam.serviceAccountTokenCreator"

# Allow Workflows Agent to impersonate Control Plane SA (to generate tokens)
gcloud iam service-accounts add-iam-policy-binding $RUNTIME_SA_EMAIL \
  --project=$PROJECT_ID \
  --member="serviceAccount:$WORKFLOWS_SA_EMAIL" \
  --role="roles/iam.serviceAccountTokenCreator"


echo "Setup Complete! Don't forget to configure Secrets (see Part 2 -> Secret Manager)."
```

---

## Part 2: Detailed Component Reference

### 1. Secret Manager Setup

Store sensitive credentials securely.

**Create Secrets:**

```bash
# 1. Database URL (Control Plane)
# Replace with actual connection string
echo -n "postgresql://user:pass@host:5432/db" | \
  gcloud secrets create control-plane-db-url --project=vendin-store --data-file=-

# 2. Neon API Key
echo -n "your-neon-api-key" | \
  gcloud secrets create neon-api-key --project=vendin-store --data-file=-

# 3. Neon Project ID
echo -n "your-neon-project-id" | \
  gcloud secrets create neon-project-id --project=vendin-store --data-file=-

# 4. Admin API Key (for Control Plane protection)
echo -n "your-secure-admin-api-key" | \
  gcloud secrets create control-plane-admin-api-key --project=vendin-store --data-file=-

# 5. Cloudflare Zone ID
echo -n "your-cloudflare-zone-id" | \
  gcloud secrets create cloudflare-zone-id --project=vendin-store --data-file=-
```

**Grant Access:**
Service accounts need `roles/secretmanager.secretAccessor` on specific secrets to read them.
The "Quick Setup" grants this role globally to `github-actions-sa`, but for runtime apps, grant specifically:

```bash
gcloud secrets add-iam-policy-binding control-plane-db-url \
  --project=vendin-store \
  --member="serviceAccount:control-plane-sa@vendin-store.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
# Repeat for other secrets...
```

### 2. Workload Identity Federation (WIF) Details

WIF allows GitHub Actions to deploy without long-lived JSON keys.

- **Pool**: `github-pool`
- **Provider**: `github-provider`
- **Mapping**: Matches GitHub `assertion.repository` to Google `attribute.repository`.

**GitHub Secrets to Configure:**
| Secret | Value Example |
| :--- | :--- |
| `GCP_PROJECT_ID` | `vendin-store` |
| `GCP_WIF_PROVIDER` | `projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_WIF_SERVICE_ACCOUNT` | `github-actions-sa@vendin-store.iam.gserviceaccount.com` |

### 3. Artifact Registry Details

- **Name**: `containers`
- **Location**: `southamerica-east1`
- **Format**: Docker
- **Cleanup Policies**: Highly recommended to save costs.
  - Delete untagged images older than 30d.
  - Keep only last 5 versions of `control-plane` and `tenant-instance`.

### 4. Cloud Run & Tenant Instances

**Architecture:**

- **Control Plane**: Single instance, manages tenants.
- **Tenant Instances**: One Cloud Run service per tenant (`tenant-{id}`), scaled to zero when idle.

**Runtime Identity:**

- **Control Plane** runs as `control-plane-sa`.
- **Tenants** run as `cloud-run-sa`.

**Manual Deployment (Testing):**

```bash
gcloud run deploy tenant-test-01 \
  --project=vendin-store \
  --region=southamerica-east1 \
  --image=southamerica-east1-docker.pkg.dev/vendin-store/containers/tenant-instance:latest \
  --service-account=cloud-run-sa@vendin-store.iam.gserviceaccount.com \
  --min-instances=0
```

---

## Verification

Run these to verify your environment is ready:

```bash
# 1. Check APIs
gcloud services list --project=vendin-store --filter="name:run.googleapis.com"

# 2. Check WIF Pool
gcloud iam workload-identity-pools describe github-pool --project=vendin-store --location=global

# 3. Check Artifact Registry
gcloud artifacts repositories describe containers --project=vendin-store --location=southamerica-east1

# 4. Check Secrets
gcloud secrets list --project=vendin-store
```
