# GCP Workflows

This directory contains the YAML definitions for Google Cloud Workflows used by the Control Plane to orchestrate infrastructure tasks.

## Workflows

### 1. Provision Tenant (`provision-tenant.yaml`)

Orchestrates the creation of a new tenant, including:

- Database creation (Neon)
- Migration execution
- Service deployment (Cloud Run)
- Domain setup (Cloudflare)

## Deployment

### Automated Deployment (CD)

Any changes to files in this directory pushed to the `main` branch will automatically trigger the [Deploy GCP Workflows](../../.github/workflows/deploy-workflows.yml) GitHub Action.

### Manual Deployment

You can deploy a workflow manually using the `gcloud` CLI:

```bash
gcloud workflows deploy provision-tenant \
  --source=gcp/workflows/provision-tenant.yaml \
  --location=southamerica-east1
```

## IAM Permissions

### Deployment Service Account (GitHub Actions)

The functionality provided by the `fix-cloud-run-permissions.sh` script grants the following roles to the GitHub Actions Service Account to enable automated deployment:

- `roles/workflows.admin`: Required to create/update workflow definitions.
- `roles/run.admin`: Required if the deployment also manages permissions for the running service.
- `roles/secretmanager.secretAccessor`: Required to access secrets during deployment validation.

### Runtime Service Account

The service account that executes the workflow (Identity) needs:

- `roles/logging.logWriter`: To write logs.
- `roles/run.admin`: To deploy Cloud Run services (as performed by this workflow).
- `roles/secretmanager.secretAccessor`: To access secrets during execution.
