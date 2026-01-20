# GCP Artifact Registry Setup

## Overview

This document provides step-by-step instructions for setting up Google Cloud Artifact Registry for container image storage.

## Prerequisites

- Google Cloud CLI (`gcloud`) installed and authenticated
- Access to the `vendin-store` GCP project
- Required permissions: `roles/artifactregistry.admin` or equivalent

## Step 1: Enable Required APIs

```bash
# Enable Artifact Registry API
gcloud services enable artifactregistry.googleapis.com --project=vendin-store

# Enable Container Registry API (for migration compatibility)
gcloud services enable containerregistry.googleapis.com --project=vendin-store
```

## Step 2: Create Artifact Registry Repository

```bash
# Create Docker repository in South America East 1 region
gcloud artifacts repositories create containers \
  --project=vendin-store \
  --repository-format=docker \
  --location=southamerica-east1 \
  --description="Container images for Vendin applications"
```

## Step 3: Configure Repository Settings

```bash
# Set up cleanup policies (optional but recommended)
gcloud artifacts repositories set-cleanup-policies containers \
  --project=vendin-store \
  --location=southamerica-east1 \
  --policy=policy.json
```

Create `policy.json` with cleanup rules (must be a JSON array):

```json
[
  {
    "name": "delete_old_images",
    "action": {
      "type": "DELETE"
    },
    "condition": {
      "olderThan": "30d",
      "tagState": "UNTAGGED"
    }
  },
  {
    "name": "keep_recent_versions",
    "action": {
      "type": "KEEP"
    },
    "mostRecentVersions": {
      "packageNamePrefixes": ["control-plane"],
      "keepCount": 5
    }
  }
]
```

## Step 4: Grant Access to Service Account

```bash
# Grant write access to GitHub Actions service account
SERVICE_ACCOUNT_EMAIL="github-actions-sa@vendin-store.iam.gserviceaccount.com"

gcloud artifacts repositories add-iam-policy-binding containers \
  --project=vendin-store \
  --location=southamerica-east1 \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.writer"
```

## Step 5: Verify Setup

```bash
# List repositories
gcloud artifacts repositories list --project=vendin-store --location=southamerica-east1

# Check repository details
gcloud artifacts repositories describe containers \
  --project=vendin-store \
  --location=southamerica-east1

# Test authentication (from a machine with Docker)
gcloud auth configure-docker southamerica-east1-docker.pkg.dev --project=vendin-store
```

## GitHub Secrets Configuration

Add these secrets to your GitHub repository:

```
GCP_ARTIFACT_REGISTRY_DOMAIN = southamerica-east1-docker.pkg.dev
GCP_ARTIFACT_REGISTRY_REPO = containers
```

## Usage in GitHub Actions

The repository will be used in your deployment workflow like this:

```yaml
- name: Build and push container
  run: |
    IMAGE_BASE="${{ env.ARTIFACT_REGISTRY_DOMAIN }}/${{ env.PROJECT_ID }}/${{ env.ARTIFACT_REGISTRY_REPO }}/${{ env.SERVICE_NAME }}"
    IMAGE_SHA="$IMAGE_BASE:${{ github.sha }}"
    IMAGE_LATEST="$IMAGE_BASE:latest"

    docker build -t $IMAGE_SHA -t $IMAGE_LATEST .
    docker push $IMAGE_SHA
    docker push $IMAGE_LATEST
```

## Repository Structure

After deployment, your repository will contain images like:

```
southamerica-east1-docker.pkg.dev/vendin-store/containers/
├── control-plane:latest
├── control-plane:abc123... (commit SHA)
├── tenant-instance:latest
└── tenant-instance:def456... (commit SHA)
```

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure the service account has `artifactregistry.writer` role
2. **Repository not found**: Check the location and project ID
3. **Push fails**: Verify Docker authentication with `gcloud auth configure-docker`

### Cleanup Commands

```bash
# Delete repository (use with caution)
gcloud artifacts repositories delete containers \
  --project=vendin-store \
  --location=southamerica-east1 \
  --quiet
```

## Cost Optimization

- Use cleanup policies to automatically delete old images
- Store only necessary image tags (latest + recent commits)
- Consider using different repositories for different environments (dev/staging/prod)
