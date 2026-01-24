# Cloudflare R2 Setup Guide

This document details the configuration of Cloudflare R2 Storage for the multi-tenant platform.

## 1. Create R2 Bucket

1.  Log in to the Cloudflare Dashboard.
2.  Navigate to **R2**.
3.  Click **Create Bucket**.
4.  Name the bucket (e.g., `vendin-store-assets`).
5.  Click **Create Bucket**.
6.  (Optional) Enable **Public Access** (Custom Domain) or configure a worker for public access.
    *   Go to **Settings** > **Public Access** > **Custom Domains**.
    *   Connect a domain (e.g., `assets.vendin.store`).
    *   Note the public URL.

## 2. Generate API Token

1.  On the R2 main page, click **Manage R2 API Tokens**.
2.  Click **Create API Token**.
3.  Select permission: **Object Read & Write**.
4.  Limit scope to the specific bucket created above (recommended) or allow all.
5.  Click **Create API Token**.
6.  **Important:** Save the following values immediately:
    *   **Access Key ID**
    *   **Secret Access Key**
    *   **Endpoint** (Use the S3 API endpoint provided, usually `https://<account-id>.r2.cloudflarestorage.com`)

## 3. Configure GCP Secret Manager

Store the R2 credentials as secrets in Google Cloud Secret Manager. These are used by the Control Plane to inject configuration into Tenant Instances.

Run the following commands (replace values with your actual credentials):

```bash
# Set your project
export PROJECT_ID=vendin-store

# 1. Access Key ID
echo -n "YOUR_ACCESS_KEY_ID" | \
  gcloud secrets create r2-access-key-id \
    --project=$PROJECT_ID \
    --data-file=-

# 2. Secret Access Key
echo -n "YOUR_SECRET_ACCESS_KEY" | \
  gcloud secrets create r2-secret-access-key \
    --project=$PROJECT_ID \
    --data-file=-

# 3. Bucket Name
echo -n "vendin-store-assets" | \
  gcloud secrets create r2-bucket-name \
    --project=$PROJECT_ID \
    --data-file=-

# 4. R2 Endpoint (S3 API)
echo -n "https://<ACCOUNT_ID>.r2.cloudflarestorage.com" | \
  gcloud secrets create r2-endpoint \
    --project=$PROJECT_ID \
    --data-file=-

# 5. Public URL Base
# If using custom domain: https://assets.vendin.store
# If using r2.dev (testing): https://pub-<hash>.r2.dev
echo -n "https://assets.vendin.store" | \
  gcloud secrets create r2-public-url \
    --project=$PROJECT_ID \
    --data-file=-
```

## 4. Verify Configuration

The Control Plane will automatically validate these credentials during tenant provisioning.
