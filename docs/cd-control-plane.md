# Control Plane CD Pipeline

## Overview

1. Pushes to `main` that touch `apps/control-plane/**`, shared packages, or root config trigger the workflow.
2. Workflow authenticates to Google Cloud via Workload Identity Federation, builds the `Dockerfile`, tags two images (`latest` and commit hash), pushes them to Artifact Registry, and deploys the hashed image to Cloud Run.
3. Cloud Run is configured in `southamerica-east1`, uses `min-instances=0`, and listens on port `3000`.

## Required GitHub Secrets

| Secret                         | Description                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`               | ID of the Google Cloud project that owns the Artifact Registry repository and Cloud Run service.                                       |
| `GCP_WIF_PROVIDER`             | Full identifier of the Workload Identity Provider (e.g., `projects/123/locations/global/workloadIdentityPools/pool/providers/github`). |
| `GCP_WIF_SERVICE_ACCOUNT`      | Email of the service account the workflow impersonates (e.g., `control-plane-deployer@project-id.iam.gserviceaccount.com`).            |
| `GCP_ARTIFACT_REGISTRY_DOMAIN` | Artifact Registry domain for the region, e.g., `southamerica-east1-docker.pkg.dev`.                                                    |
| `GCP_ARTIFACT_REGISTRY_REPO`   | Artifact Registry repository name (e.g., `control-plane`).                                                                             |

## Service Account Requirements

- **Roles**: Grant `roles/artifactregistry.writer`, `roles/run.admin`, `roles/run.developer`, and `roles/cloudbuild.builds.builder` (if builds rely on Cloud Build). Include `roles/iam.serviceAccountUser` if using Workload Identity.
- **Workload Identity**: The GitHub identity must map to the service account. See [gcloud docs](https://cloud.google.com/iam/docs/workload-identity-federation) for the `policy` configuration.

## Local Deploy Script

The root `package.json` exposes:

```json
"deploy:control-plane": "turbo run build --filter=@vendin/control-plane && gcloud run deploy control-plane --source . --region southamerica-east1 --min-instances 0"
```

Ensure `gcloud` is authenticated with the same project and service account before running locally. The script expects the `Control Plane` workspace to compile via `bun x tsc` and uses `gcloud run deploy` to upload the source bundle from the repo root.
