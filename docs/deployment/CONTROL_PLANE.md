# Control Plane CD Pipeline

**Last Updated**: 2026-01-20
**Status**: ✅ Active  
**Component**: `apps/control-plane`  
**Workflow**: `.github/workflows/deploy.yml`

## Overview

Automated deployment pipeline for the Control Plane application to Google Cloud Run:

1. **Trigger**: Pushes to `main` affecting:
   - `apps/control-plane/**`
   - Shared packages
   - Root configuration files

2. **Build Process**:
   - Authenticate via Workload Identity Federation
   - Build Docker image from `Dockerfile`
   - Tag images: `latest` and commit SHA
   - Push to Artifact Registry

3. **Deployment**:
   - Deploy to Cloud Run (`southamerica-east1`)
   - Configuration: `min-instances=0` (scale to zero)
   - Port: `3000`

## Cloud Run Configuration

### Region

- **Primary**: `southamerica-east1` (São Paulo, Brazil)
- **Reason**: Low latency for Brazilian customers

### Scaling

- **Min Instances**: `0` (cost optimization)
- **Max Instances**: Auto-scaled by Cloud Run
- **Cold Start**: ~2-3 seconds on first request

### Networking

- **Port**: `3000`
- **Protocol**: HTTP/2
- **Timeout**: 300 seconds (5 minutes)

## Required GitHub Secrets

Configure these secrets in GitHub repository settings:

| Secret                         | Description                                                          | Example                                                                 |
| ------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `GCP_PROJECT_ID`               | Google Cloud project ID                                              | `vendin-production`                                                     |
| `GCP_WIF_PROVIDER`             | Workload Identity Provider full path                                 | `projects/123/locations/global/workloadIdentityPools/pool/providers/gh` |
| `GCP_WIF_SERVICE_ACCOUNT`      | Service account email for deployment                                 | `control-plane-deployer@vendin-production.iam.gserviceaccount.com`      |
| `GCP_ARTIFACT_REGISTRY_DOMAIN` | Artifact Registry domain for region                                  | `southamerica-east1-docker.pkg.dev`                                     |
| `GCP_ARTIFACT_REGISTRY_REPO`   | Artifact Registry repository name                                    | `control-plane`                                                         |
| `DATABASE_URL`                 | Neon PostgreSQL connection string for Control Plane metadata storage | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/control_plane`   |
| `NEON_API_KEY`                 | Neon API key for tenant database provisioning                        | `neon_api_key_xxx`                                                      |
| `NEON_PROJECT_ID`              | Neon Project ID for tenant database provisioning                     | `lucky-shape-123456`                                                    |

## Service Account Permissions

### Required IAM Roles

Grant the following roles to `GCP_WIF_SERVICE_ACCOUNT`:

- `roles/artifactregistry.writer` - Push Docker images
- `roles/run.admin` - Manage Cloud Run services
- `roles/run.developer` - Deploy Cloud Run revisions
- `roles/iam.serviceAccountUser` - Act as service account
- `roles/cloudbuild.builds.builder` - Build container images (if using Cloud Build)

### Workload Identity Federation Setup

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create github-pool \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create Provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"

# Bind Service Account
gcloud iam service-accounts add-iam-policy-binding \
  control-plane-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/ORG/REPO"
```

See [Workload Identity Federation docs](https://cloud.google.com/iam/docs/workload-identity-federation) for details.

## Local Deployment

### Prerequisites

```bash
# Authenticate with GCP
gcloud auth login

# Set project
gcloud config set project vendin-production

# Configure Docker for Artifact Registry
gcloud auth configure-docker southamerica-east1-docker.pkg.dev
```

### Deploy via Script

```bash
# Using package.json script
bun run deploy:control-plane
```

**Script definition** (from `package.json`):

```json
{
  "scripts": {
    "deploy:control-plane": "turbo run build --filter=@vendin/control-plane && gcloud run deploy control-plane --source . --region southamerica-east1 --min-instances 0"
  }
}
```

### Manual Deploy

```bash
# Build application
cd apps/control-plane
bun run build

# Deploy to Cloud Run
gcloud run deploy control-plane \
  --source . \
  --region southamerica-east1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --port 3000 \
  --set-env-vars "DATABASE_URL=postgresql://..."
```

## CI/CD Workflow

### Deployment Flow

```mermaid
graph LR
    A[Push to main] --> B[Detect Changes]
    B --> C[Build Docker Image]
    C --> D[Push to Artifact Registry]
    D --> E[Deploy to Cloud Run]
    E --> F[Health Check]
    F --> G{Success?}
    G -->|Yes| H[Mark as Deployed]
    G -->|No| I[Rollback]
```

### Environment Variables

The workflow automatically injects:

- `DATABASE_URL` - From GitHub secrets
- `NEON_API_KEY` - From GitHub secrets
- `NEON_PROJECT_ID` - From GitHub secrets
- `NODE_ENV=production`
- `PORT=3000`
- `NEON_DEFAULT_DB=neondb` (configurable via `deploy.yml`)

### Health Checks

Cloud Run performs health checks on:

- **Path**: `/health` or `/`
- **Interval**: Every 10 seconds
- **Timeout**: 5 seconds
- **Failure Threshold**: 3 consecutive failures trigger rollback

## Monitoring & Logs

### View Logs

```bash
# Stream logs
gcloud run logs tail control-plane --region southamerica-east1

# View recent logs
gcloud run logs read control-plane --region southamerica-east1 --limit 100
```

### Metrics

Monitor in Google Cloud Console:

- Request count
- Request latency (p50, p95, p99)
- Error rate
- Container CPU/Memory usage
- Cold start frequency

## Troubleshooting

### Common Issues

**Image not found**:

```bash
# Verify image exists
gcloud artifacts docker images list southamerica-east1-docker.pkg.dev/PROJECT_ID/control-plane
```

**Permission denied**:

```bash
# Check service account IAM bindings
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:control-plane-deployer@*"
```

**Cold start timeouts**:

- Increase `min-instances` to 1 for critical services
- Optimize container startup time
- Use Cloud Run's warmup requests feature

## Related Documentation

- [Control Plane API Development](../../.agent/rules/apps/control-plane/api-development.md)
- [Control Plane Domain Structure](../../.agent/rules/apps/control-plane/domain-structure.md)
- [Test Architecture](../test/README.md)
- [Database Infrastructure](../../.agent/rules/infrastructure/database.md)
- [Cloud Run Infrastructure](../../.agent/rules/infrastructure/cloud-run.md)
