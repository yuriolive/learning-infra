# GCP Cloud Run Setup (MedusaJS Tenant Instances)

## Overview

This document provides step-by-step instructions for setting up Google Cloud Run to host your **MedusaJS Tenant Instances**. Each tenant runs in an isolated, scale-to-zero environment.

## Prerequisites

- Google Cloud CLI (`gcloud`) installed and authenticated
- Access to the `vendin-store` GCP project
- MedusaJS container images built and pushed to Artifact Registry
- Workload Identity Federation configured
- Required permissions: `roles/cloudrun.admin` or equivalent

## Step 1: Enable Cloud Run API

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com --project=vendin-store
```

## Step 2: Create Service Account for Tenant Instances

```bash
# Create Cloud Run service account
gcloud iam service-accounts create cloud-run-sa \
  --project=vendin-store \
  --description="Cloud Run runtime service account for MedusaJS tenants" \
  --display-name="Tenant Runtime SA"
```

## Step 3: Global IAM Permissions

MedusaJS instances need access to logging and monitoring:

```bash
export CLOUD_RUN_SA_EMAIL="cloud-run-sa@vendin-store.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$CLOUD_RUN_SA_EMAIL" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$CLOUD_RUN_SA_EMAIL" \
  --role="roles/monitoring.metricWriter"
```

## Step 4: Configure Networking (Optional)

By default, Cloud Run services have direct internet access. If you need to restrict traffic or use a static outbound IP, you can configure a VPC connector. For most Neon/external database setups, this is not required.

---

## Tenant Instance Deployment Pattern

Each tenant gets its own isolated Cloud Run service running a MedusaJS 2.0 instance. These are **dynamically provisioned** by the Control Plane when a new merchant signs up.

### Service Naming Convention

Tenant services follow the pattern: `tenant-{tenantId}`
Example: `tenant-abc123`, `tenant-xyz789`

### Manual Tenant Instance Deployment (For Testing)

Before implementing automated provisioning, you can test tenant instance deployment manually:

```bash
# Example: Deploy a test tenant instance
export TENANT_ID="test-tenant-001"

gcloud run deploy tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --image=southamerica-east1-docker.pkg.dev/vendin-store/containers/tenant-instance:latest \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --cpu=1 \
  --memory=1Gi \
  --port=9000 \
  --set-env-vars=NODE_ENV=production,TENANT_ID=${TENANT_ID},REDIS_NAMESPACE=tenant-${TENANT_ID} \
  --set-secrets=DATABASE_URL=tenant-${TENANT_ID}-db-url:latest
```

### Tenant Instance Configuration

**Key Configuration Points:**

- **Scale-to-Zero**: `--min-instances=0` (critical for cost efficiency)
- **Per-Tenant Secrets**: Each tenant has its own database URL secret
- **Redis Namespacing**: Use `REDIS_NAMESPACE` to isolate cache per tenant
- **Tenant ID**: Required environment variable for tenant identification

---

## Step 5: Monitoring and Observability

```bash
# Enable Cloud Run observability for a specific tenant
gcloud run services update tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --execution-environment=gen2
```

## Step 6: Configure Health Checks (Optional)

```bash
# Configure MedusaJS health checks
gcloud run services update tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --health-check-type=http \
  --health-check-path=/health \
  --health-check-initial-delay=30 \
  --health-check-timeout=5
```

## Step 7: Scaling and Cost Optimization

All tenant instances should use `--min-instances=0` to enable scale-to-zero and minimize costs for idle tenants.

```bash
# Optimize for cost (high concurrency, scale-to-zero)
gcloud run services update tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=10 \
  --cpu-throttling
```

---

## Troubleshooting

### Common Issues

1. **Cold starts**: Initial request may take seconds if instance is scaled to zero.
2. **Database Connectivity**: Ensure the MedusaJS instance has the correct `DATABASE_URL` secret.
3. **Memory Limits**: MedusaJS 2.0 may require at least 1Gi allocated to start reliably.

### Useful Commands

```bash
# List all MedusaJS tenant instances
gcloud run services list --project=vendin-store --region=southamerica-east1 \
  --filter="metadata.name:tenant-*"

# View tenant instance logs
gcloud run logs read tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --limit=50

# Delete a tenant instance
gcloud run services delete tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --quiet
```
