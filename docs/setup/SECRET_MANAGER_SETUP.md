# GCP Secret Manager Setup

## Overview

This document provides step-by-step instructions for setting up Google Cloud Secret Manager to securely store database credentials and other sensitive configuration.

## Prerequisites

- Google Cloud CLI (`gcloud`) installed and authenticated
- Access to the `vendin-store` GCP project
- Database connection string ready (Neon, Cloud SQL, or other PostgreSQL)
- Required permissions: `roles/secretmanager.admin` or equivalent

## Step 1: Enable Secret Manager API

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com --project=vendin-store
```

## Step 2: Create Database URL Secret

```bash
# Create the database URL secret (replace with your actual connection string)
DATABASE_URL="postgresql://username:password@hostname:5432/database"

echo -n "$DATABASE_URL" | \
  gcloud secrets create control-plane-db-url \
    --project=vendin-store \
    --data-file=- \
    --labels=environment=production,service=control-plane

# Create Neon API Key secret
echo -n "your-neon-api-key" | \
  gcloud secrets create neon-api-key \
    --project=vendin-store \
    --data-file=- \
    --labels=environment=production,service=control-plane

# Create Neon Project ID secret
echo -n "your-neon-project-id" | \
  gcloud secrets create neon-project-id \
    --project=vendin-store \
    --data-file=- \
    --labels=environment=production,service=control-plane

# Create Admin API Key secret
echo -n "your-secure-admin-api-key" | \
  gcloud secrets create control-plane-admin-api-key \
    --project=vendin-store \
    --data-file=- \
    --labels=environment=production,service=control-plane
```

## Step 3: Grant Access to Service Account

```bash
# Grant access to GitHub Actions service account
SERVICE_ACCOUNT_EMAIL="github-actions-sa@vendin-store.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding control-plane-db-url \
  --project=vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding neon-api-key \
  --project=vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding neon-project-id \
  --project=vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding control-plane-admin-api-key \
  --project=vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 4: Create Additional Secrets (Optional)

### API Keys Secret

```bash
# Create API keys secret for external services
echo -n '{"stripe_key": "sk_test_...", "sendgrid_key": "SG...."}' | \
  gcloud secrets create api-keys \
    --project=vendin-store \
    --data-file=- \
    --labels=environment=production,type=api-keys
```

### JWT Secret

```bash
# Create JWT signing secret
openssl rand -base64 32 | \
  gcloud secrets create jwt-secret \
    --project=vendin-store \
    --data-file=- \
    --labels=environment=production,type=jwt
```

## Step 5: Grant Access for Additional Secrets

```bash
# Grant access for additional secrets
gcloud secrets add-iam-policy-binding api-keys \
  --project=vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding jwt-secret \
  --project=vendin-store \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 6: Verify Setup

```bash
# List all secrets
gcloud secrets list --project=vendin-store

# Check specific secret details
gcloud secrets describe control-plane-db-url --project=vendin-store

# Test access (should work with service account)
gcloud secrets versions access latest \
  --secret=control-plane-db-url \
  --project=vendin-store
```

## Usage in Cloud Run

Secrets are accessed in Cloud Run using the `--secrets` flag:

```yaml
# In your deploy.yml workflow
- name: Deploy to Cloud Run
  uses: google-github-actions/deploy-cloudrun@v2
  with:
    service: control-plane
    secrets: |
      DATABASE_URL=control-plane-db-url:latest
      JWT_SECRET=jwt-secret:latest
      API_KEYS=api-keys:latest
```

**Note**: When the secret is in the same project, use the format `ENV_VAR_NAME=SECRET_NAME:VERSION`. Do not use the full resource path (`projects/.../secrets/...`). The format `SECRET_NAME:latest` is sufficient.

````

## Version Management

### Create New Version of Secret

```bash
# Update database URL (creates new version)
echo -n "postgresql://new-username:new-password@new-hostname:5432/new-database" | \
  gcloud secrets versions add control-plane-db-url \
    --project=vendin-store \
    --data-file=-
````

### List Secret Versions

```bash
gcloud secrets versions list control-plane-db-url --project=vendin-store
```

### Access Specific Version

```bash
# Access version 2 instead of latest
gcloud secrets versions access 2 \
  --secret=control-plane-db-url \
  --project=vendin-store
```

## Best Practices

### Security Recommendations

1. **Principle of Least Privilege**: Only grant access to specific secrets for each service account
2. **Regular Rotation**: Rotate secrets regularly (database passwords, API keys)
3. **Environment Separation**: Use different secrets for different environments
4. **Access Monitoring**: Monitor secret access logs in Cloud Logging

### Naming Conventions

- Use descriptive names: `service-name-secret-purpose`
- Examples: `control-plane-db-url`, `api-gateway-jwt-secret`, `worker-queue-redis-url`

### Labels for Organization

```bash
# Add labels when creating secrets
gcloud secrets create my-secret \
  --project=vendin-store \
  --data-file=- \
  --labels=environment=production,service=control-plane,type=database
```

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure service account has `secretmanager.secretAccessor` role
2. **Secret not found**: Check project ID and secret name spelling
3. **Access fails in Cloud Run**: Verify the secret reference format in deployment

### Useful Commands

```bash
# View secret IAM policy
gcloud secrets get-iam-policy control-plane-db-url --project=vendin-store

# Update secret labels
gcloud secrets update control-plane-db-url \
  --project=vendin-store \
  --update-labels=environment=staging

# Disable old secret versions (keeps them but marks as disabled)
gcloud secrets versions disable 1 \
  --secret=control-plane-db-url \
  --project=vendin-store
```

## Cost Considerations

- Secret Manager is free for the first 6 active secret versions per month
- Additional versions cost $0.06 per version per month
- Access operations are free up to 10,000 per month

## Cleanup Commands

```bash
# Delete secret (use with caution - irreversible)
gcloud secrets delete control-plane-db-url --project=vendin-store --quiet

# Delete specific version
gcloud secrets versions destroy 1 \
  --secret=control-plane-db-url \
  --project=vendin-store
```
