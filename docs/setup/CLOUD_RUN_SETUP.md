# GCP Cloud Run Setup

## Overview

This document provides step-by-step instructions for setting up Google Cloud Run for deploying containerized applications with proper configuration.

## Prerequisites

- Google Cloud CLI (`gcloud`) installed and authenticated
- Access to the `vendin-store` GCP project
- Container images built and pushed to Artifact Registry
- Workload Identity Federation configured
- Required permissions: `roles/cloudrun.admin` or equivalent

## Step 1: Enable Cloud Run API

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com --project=vendin-store
```

## Step 2: Create Service Account for Cloud Run

```bash
# Create Cloud Run service account (optional - can use the same as GitHub Actions)
gcloud iam service-accounts create cloud-run-sa \
  --project=vendin-store \
  --description="Cloud Run runtime service account" \
  --display-name="Cloud Run SA"
```

## Step 3: Allow GitHub Actions to Use Cloud Run Service Account

If you deploy with GitHub Actions and set `--service-account=cloud-run-sa@...`, the GitHub Actions service account must be allowed to impersonate the Cloud Run runtime service account.

```bash
# Allow GitHub Actions SA to act as Cloud Run SA
export GITHUB_ACTIONS_SA_EMAIL="github-actions-sa@vendin-store.iam.gserviceaccount.com"
export CLOUD_RUN_SA_EMAIL="cloud-run-sa@vendin-store.iam.gserviceaccount.com"

gcloud iam service-accounts add-iam-policy-binding $CLOUD_RUN_SA_EMAIL \
  --project=vendin-store \
  --role="roles/iam.serviceAccountUser" \
  --member="serviceAccount:$GITHUB_ACTIONS_SA_EMAIL"
```

## Step 4: Grant Secret Access to Cloud Run

Cloud Run needs permission to access the secrets stored in Secret Manager (like `DATABASE_URL`).

```bash
# Grant Cloud Run service account access to Secret Manager
export CLOUD_RUN_SA_EMAIL="cloud-run-sa@vendin-store.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$CLOUD_RUN_SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 5: Configure Networking (Optional)

By default, Cloud Run services have direct internet access. If you need to restrict traffic or use a static outbound IP, you can configure a VPC connector. For most Neon/external database setups, this is not required.

## Step 6: Deploy Control Plane Service (Manual)

The Control Plane is a **shared service** that orchestrates tenant provisioning. Before using GitHub Actions, test manual deployment:

```bash
# Deploy control-plane service manually
gcloud run deploy control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --image=southamerica-east1-docker.pkg.dev/vendin-store/containers/control-plane:latest \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --cpu=1 \
  --memory=512Mi \
  --port=3000 \
  --set-env-vars=NODE_ENV=production \
  --set-secrets=DATABASE_URL=control-plane-db-url:latest
```

**Note**: This is a single shared service that manages all tenants. It handles merchant signup, database creation, and tenant instance provisioning.

## Step 7: Configure Custom Domain (Optional)

```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --project=vendin-store \
  --region=southamerica-east1 \
  --service=control-plane \
  --domain=control.vendin.store

# Verify domain mapping
gcloud run domain-mappings list \
  --project=vendin-store \
  --region=southamerica-east1
```

## Step 8: Set Up Monitoring and Logging

```bash
# Enable Cloud Run observability
gcloud run services update control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --set-env-vars=NODE_ENV=production \
  --execution-environment=gen2
```

## Step 9: Configure Health Checks (Optional)

If your application has custom health check endpoints:

```bash
# Configure health checks
gcloud run services update control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --health-check-type=http \
  --health-check-path=/health \
  --health-check-initial-delay=10 \
  --health-check-timeout=5
```

## Step 10: Set Up Traffic Management

```bash
# Configure traffic splitting (for gradual rollouts)
gcloud run services update-traffic control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --to-revisions=LATEST=100
```

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
  --memory=512Mi \
  --port=3000 \
  --set-env-vars=NODE_ENV=production,TENANT_ID=${TENANT_ID},REDIS_NAMESPACE=tenant-${TENANT_ID} \
  --set-secrets=DATABASE_URL=tenant-${TENANT_ID}-db-url:latest
```

### Tenant Instance Configuration

**Key Configuration Points:**

- **Scale-to-Zero**: `--min-instances=0` (critical for cost efficiency)
- **Per-Tenant Secrets**: Each tenant has its own database URL secret
- **Redis Namespacing**: Use `REDIS_NAMESPACE` to isolate cache per tenant
- **Tenant ID**: Required environment variable for tenant identification

### Provisioning Automation

The Control Plane will programmatically create tenant instances using the Cloud Run Admin API. Here's the pattern:

**Using gcloud (for reference):**

```bash
# Control Plane would execute this via API or gcloud command
gcloud run services create tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --image=southamerica-east1-docker.pkg.dev/vendin-store/containers/tenant-instance:latest \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --cpu=1 \
  --memory=512Mi \
  --port=3000 \
  --service-account=cloud-run-sa@vendin-store.iam.gserviceaccount.com
```

**Using Cloud Run Admin API (recommended for automation):**

The Control Plane should use the [Cloud Run Admin API](https://cloud.google.com/run/docs/reference/rest) to create services programmatically. This allows for better error handling and rollback capabilities.

### Tenant Instance Cleanup

When a tenant is deleted, the Control Plane must clean up the Cloud Run service:

```bash
# Delete tenant instance
gcloud run services delete tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --quiet
```

## GitHub Actions Integration

Your deployment workflow should look like this:

```yaml
# In .github/workflows/deploy.yml
- name: Deploy to Cloud Run
  uses: google-github-actions/deploy-cloudrun@v2
  with:
    service: control-plane
    region: southamerica-east1
    image: southamerica-east1-docker.pkg.dev/vendin-store/containers/control-plane:${{ github.sha }}
    flags: |
      --min-instances=0
      --max-instances=10
      --cpu=1
      --memory=512Mi
      --allow-unauthenticated
    secrets: |
      DATABASE_URL=control-plane-db-url:latest
    env_vars: |
      NODE_ENV=production
      PORT=3000
```

## Scaling Configuration

### Control Plane Scaling

The Control Plane is a shared service that handles provisioning requests:

```bash
# Configure concurrency and scaling for control-plane
gcloud run services update control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=10 \
  --cpu-throttling
```

### Tenant Instance Scaling

Each tenant instance scales independently based on its own traffic:

```bash
# Configure scaling for a specific tenant instance
gcloud run services update tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=10 \
  --cpu-throttling
```

**Important**: All tenant instances should use `--min-instances=0` to enable scale-to-zero and minimize costs for idle tenants.

### Manual Scaling (Emergency Only)

```bash
# Scale control-plane to specific instance count (if needed)
gcloud run services update control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --min-instances=1

# Scale tenant instance (rarely needed)
gcloud run services update tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --min-instances=1
```

## Security Best Practices

### IAM Permissions

```bash
# Grant minimal permissions to Cloud Run service account
gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$CLOUD_RUN_SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$CLOUD_RUN_SA_EMAIL" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$CLOUD_RUN_SA_EMAIL" \
  --role="roles/monitoring.metricWriter"
```

### Network Security

If you configured a VPC connector in Step 4:

```bash
# Configure VPC egress
gcloud run services update control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --vpc-connector=connector \
  --egress-settings=all
```

## Monitoring and Observability

### Enable Request Logging

```bash
# Cloud Run automatically logs requests
# View logs in Cloud Logging
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=control-plane" \
  --project=vendin-store \
  --limit=10
```

### Set Up Alerts

Create alerts in Cloud Monitoring for:

- High error rates
- High latency
- Instance count spikes
- Memory/CPU usage

## Cost Optimization

### Instance Configuration

```bash
# Optimize for cost (reduce CPU allocation when not needed)
gcloud run services update control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --cpu=1 \
  --memory=512Mi \
  --concurrency=100 \
  --min-instances=0
```

### Request Timeout

```bash
# Set appropriate timeout to avoid unnecessary costs
gcloud run services update control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --timeout=300
```

## Troubleshooting

### Common Issues

1. **Cold starts**: Increase min-instances or use CPU allocation
2. **Timeout errors**: Adjust timeout settings
3. **Memory issues**: Increase memory allocation
4. **Permission denied**: Check service account permissions

### Useful Commands

```bash
# List all services (control-plane + tenant instances)
gcloud run services list --project=vendin-store --region=southamerica-east1

# List only tenant instances
gcloud run services list --project=vendin-store --region=southamerica-east1 \
  --filter="metadata.name:tenant-*"

# Get control-plane service details
gcloud run services describe control-plane \
  --project=vendin-store \
  --region=southamerica-east1

# Get tenant instance details
gcloud run services describe tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1

# View control-plane logs
gcloud run logs read control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --limit=50

# View tenant instance logs
gcloud run logs read tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --limit=50

# Check revisions
gcloud run revisions list \
  --project=vendin-store \
  --region=southamerica-east1 \
  --service=control-plane

# Get service URL (for tenant instance)
gcloud run services describe tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --format="value(status.url)"
```

## Cleanup Commands

```bash
# Delete control-plane service
gcloud run services delete control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --quiet

# Delete tenant instance
gcloud run services delete tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --quiet

# Delete all tenant instances (use with caution)
gcloud run services list --project=vendin-store --region=southamerica-east1 \
  --filter="metadata.name:tenant-*" \
  --format="value(metadata.name)" | \
  xargs -I {} gcloud run services delete {} \
    --project=vendin-store \
    --region=southamerica-east1 \
    --quiet

# Delete domain mapping
gcloud run domain-mappings delete \
  --project=vendin-store \
  --region=southamerica-east1 \
  --domain=control.vendin.store

# Delete VPC connector (if created)
gcloud compute networks vpc-access connectors delete connector \
  --project=vendin-store \
  --region=southamerica-east1
```
