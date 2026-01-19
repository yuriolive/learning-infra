# Workload Identity Federation Setup for vendin-store

## Overview

This document contains the complete setup commands for configuring Workload Identity Federation (WIF) between GitHub Actions and Google Cloud Platform for the **vendin-store** project.

## Prerequisites

- Google Cloud CLI (`gcloud`) installed and authenticated
- Access to the `vendin-store` GCP project with appropriate permissions
- GitHub repository: `yuriolive/vendin`

## Setup Commands

### Step 1: Create Service Account

```bash
gcloud iam service-accounts create github-actions-sa \
  --project=vendin-store \
  --description="GitHub Actions service account" \
  --display-name="GitHub Actions SA"
```

### Step 2: Get Service Account Email

```bash
SERVICE_ACCOUNT_EMAIL=$(gcloud iam service-accounts list \
  --project=vendin-store \
  --filter="displayName:GitHub Actions SA" \
  --format="value(email)")

echo "Service Account Email: $SERVICE_ACCOUNT_EMAIL"
# Save this email for later use in GitHub secrets
```

### Step 3: Grant Required Permissions

```bash
gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/cloudrun.admin"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/iam.workloadIdentityUser"
```

### Step 4: Create Workload Identity Pool

```bash
gcloud iam workload-identity-pools create "github-pool" \
  --project="vendin-store" \
  --location="global" \
  --description="GitHub Actions identity pool" \
  --display-name="GitHub Pool"
```

### Step 5: Get Pool ID

```bash
POOL_ID=$(gcloud iam workload-identity-pools describe "github-pool" \
  --project="vendin-store" \
  --location="global" \
  --format="value(name)")

echo "Workload Identity Pool ID: $POOL_ID"
```

### Step 6: Create OIDC Provider

Run this single command to create the OIDC provider with necessary attribute mappings and conditions:

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="vendin-store" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub provider" \
  --description="OIDC provider for GitHub Actions" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository_owner == 'yuriolive'"
```

### Step 7: Get Provider Name

```bash
PROVIDER_NAME=$(gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="vendin-store" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)")

echo "Workload Identity Provider Name: $PROVIDER_NAME"
```

### Step 8: Create IAM Policy Binding

```bash
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --project="vendin-store" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/$POOL_ID/attribute.repository/yuriolive/vendin"
```

### Step 9: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create containers \
  --project="vendin-store" \
  --repository-format=docker \
  --location=southamerica-east1 \
  --description="Container images for Vendin"
```

### Step 10: Grant Artifact Registry Access

```bash
gcloud artifacts repositories add-iam-policy-binding containers \
  --project="vendin-store" \
  --location=southamerica-east1 \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.writer"
```

### Step 11: Create Database Secret

**⚠️ IMPORTANT**: Replace the placeholder database URL with your actual Neon/PostgreSQL connection string

```bash
echo -n "postgresql://user:password@host:5432/dbname" | \
  gcloud secrets create control-plane-db-url \
    --project="vendin-store" \
    --data-file=-
```

## GitHub Secrets Configuration

After running the setup commands, add these secrets to your GitHub repository:

**Repository → Settings → Secrets and variables → Actions → Repository secrets**

| Secret Name                    | Value                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`               | `vendin-store`                                                                                           |
| `GCP_ARTIFACT_REGISTRY_DOMAIN` | `southamerica-east1-docker.pkg.dev`                                                                      |
| `GCP_ARTIFACT_REGISTRY_REPO`   | `containers`                                                                                             |
| `GCP_WIF_PROVIDER`             | `projects/[PROJECT_NUMBER]/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_WIF_SERVICE_ACCOUNT`      | `github-actions-sa@vendin-store.iam.gserviceaccount.com`                                                 |

**Note**: The `GCP_WIF_PROVIDER` value will contain your GCP **Project Number** (e.g., `110781160918`) instead of the Project ID. This is normal and recommended.

## GitHub Variables Configuration (if using Gemini features)

**Repository → Settings → Secrets and variables → Actions → Variables**

| Variable Name               | Value                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `APP_ID`                    | `[Your GitHub App ID]`                                                                               |
| `GOOGLE_CLOUD_LOCATION`     | `southamerica-east1`                                                                                 |
| `GOOGLE_CLOUD_PROJECT`      | `vendin-store`                                                                                       |
| `SERVICE_ACCOUNT_EMAIL`     | `[SERVICE_ACCOUNT_EMAIL from step 2]`                                                                |
| `GCP_WIF_PROVIDER`          | `projects/vendin-store/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GEMINI_CLI_VERSION`        | `latest`                                                                                             |
| `GEMINI_MODEL`              | `gemini-1.5-flash-002`                                                                               |
| `GOOGLE_GENAI_USE_GCA`      | `false`                                                                                              |
| `GOOGLE_GENAI_USE_VERTEXAI` | `true`                                                                                               |
| `DEBUG`                     | `false`                                                                                              |

## Verification Commands

Use these commands to verify your setup:

```bash
# Verify service account
gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=vendin-store

# Verify workload identity pool
gcloud iam workload-identity-pools describe github-pool --project=vendin-store --location=global

# Verify workload identity provider
gcloud iam workload-identity-pools providers describe github-provider \
  --project=vendin-store \
  --location=global \
  --workload-identity-pool=github-pool

# Verify artifact registry
gcloud artifacts repositories describe containers --project=vendin-store --location=southamerica-east1

# Verify secret exists
gcloud secrets describe control-plane-db-url --project=vendin-store
```

## Important Notes

1. **Execute commands in order** - later steps depend on resources created in earlier steps
2. **Save the service account email** from step 2 - you'll need it for GitHub secrets
3. **Verify yuriolive** in step 8 with your actual GitHub organization or username
4. **Update the database URL** in step 11 with your real database connection string before deploying
5. **Test the setup** by triggering your deployment workflow after configuration
6. **For Gemini features**: Create a GitHub App and configure the additional variables listed above

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure you have the necessary permissions in the GCP project
2. **Repository not found**: Verify your GitHub organization/username in step 8 (should be `yuriolive`)
3. **Deployment fails**: Check that all GitHub secrets are set correctly
4. **Database connection fails**: Verify the database URL secret is correctly formatted

### Cleanup Commands (if needed)

```bash
# Delete everything (use with caution)
gcloud iam service-accounts delete $SERVICE_ACCOUNT_EMAIL --project=vendin-store --quiet
gcloud iam workload-identity-pools delete github-pool --project=vendin-store --location=global --quiet
gcloud artifacts repositories delete containers --project=vendin-store --location=southamerica-east1 --quiet
gcloud secrets delete control-plane-db-url --project=vendin-store --quiet
```

## Next Steps

1. Run all setup commands in order
2. Configure GitHub secrets and variables
3. Update the database URL secret with your actual connection string
4. Test deployment by pushing to the main branch or manually triggering the workflow
5. If using Gemini features, create and configure a GitHub App
