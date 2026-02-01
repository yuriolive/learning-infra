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

## Service Account

The workflows are typically configured to run as a service account with the following minimum permissions:

- `roles/run.admin`
- `roles/secretmanager.secretAccessor`
- `roles/workflows.invoker`
