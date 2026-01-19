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

## Step 3: Grant Database Access to Cloud Run

```bash
# Grant Cloud Run service account access to database (if using Cloud SQL)
# For Neon or external databases, this step may not be needed

# If using Cloud SQL:
CLOUD_RUN_SA_EMAIL="cloud-run-sa@vendin-store.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding vendin-store \
  --member="serviceAccount:$CLOUD_RUN_SA_EMAIL" \
  --role="roles/cloudsql.client"
```

## Step 4: Configure VPC Network (Optional)

If you need VPC access for Cloud SQL or other internal services:

```bash
# Create VPC connector for Cloud Run (if needed for Cloud SQL)
gcloud compute networks vpc-access connectors create connector \
  --project=vendin-store \
  --region=southamerica-east1 \
  --network=default \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10
```

## Step 5: Deploy Initial Service (Manual)

Before using GitHub Actions, test manual deployment:

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

## Step 6: Configure Custom Domain (Optional)

```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --project=vendin-store \
  --region=southamerica-east1 \
  --service=control-plane \
  --domain=api.vendin.store

# Verify domain mapping
gcloud run domain-mappings list \
  --project=vendin-store \
  --region=southamerica-east1
```

## Step 7: Set Up Monitoring and Logging

```bash
# Enable Cloud Run observability
gcloud run services update control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --set-env-vars=NODE_ENV=production \
  --execution-environment=gen2
```

## Step 8: Configure Health Checks (Optional)

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

## Step 9: Set Up Traffic Management

```bash
# Configure traffic splitting (for gradual rollouts)
gcloud run services update-traffic control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --to-revisions=LATEST=100
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
      DATABASE_URL=projects/vendin-store/secrets/control-plane-db-url/versions/latest:ref
    env_vars: |
      NODE_ENV=production
      PORT=3000
```

## Scaling Configuration

### Automatic Scaling

```bash
# Configure concurrency and scaling
gcloud run services update control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=100 \
  --cpu-throttling
```

### Manual Scaling

```bash
# Scale to specific instance count
gcloud run services update control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --min-instances=2
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

```bash
# Configure VPC egress (if using VPC connector)
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
# List services
gcloud run services list --project=vendin-store --region=southamerica-east1

# Get service details
gcloud run services describe control-plane \
  --project=vendin-store \
  --region=southamerica-east1

# View logs
gcloud run logs read control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --limit=50

# Check revisions
gcloud run revisions list \
  --project=vendin-store \
  --region=southamerica-east1 \
  --service=control-plane
```

## Cleanup Commands

```bash
# Delete service
gcloud run services delete control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --quiet

# Delete domain mapping
gcloud run domain-mappings delete \
  --project=vendin-store \
  --region=southamerica-east1 \
  --domain=api.vendin.store

# Delete VPC connector
gcloud compute networks vpc-access connectors delete connector \
  --project=vendin-store \
  --region=southamerica-east1
```
