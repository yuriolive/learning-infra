---
description: Google Cloud Run deployment patterns, scaling, and tenant instance management.
globs: apps/**/*, infrastructure/**/*
---
# Cloud Run Infrastructure Rules

## Service Types

### Control Plane Service
- **Service Name**: `control-plane`
- **Type**: Shared service (one instance for all tenants)
- **Purpose**: Orchestrates tenant provisioning
- **Configuration**:
  - `min-instances: 0` (scale-to-zero)
  - `max-instances: 10`
  - `cpu: 1`
  - `memory: 512Mi`
  - `port: 3000`

### Tenant Instance Services
- **Service Naming**: See [@references.md](../shared/references.md)
- **Type**: Separate service per tenant (dynamically provisioned)
- **Purpose**: Isolated MedusaJS 2.0 backend per tenant
- **Configuration**:
  - `min-instances: 0` (scale-to-zero, critical for cost efficiency)
  - `max-instances: 10`
  - `ingress`: **Internal** (Private, no public access)
  - `authentication`: **IAM** (Invoker: Control Plane Service Account)
  - `cpu: 1`
  - `memory: 512Mi`
  - `port: 3000`

## Deployment Patterns

### Control Plane Deployment

See [docs/examples/cloud-run-deployment.sh](../../docs/examples/cloud-run-deployment.sh) for deployment commands.

### Tenant Instance Deployment (Programmatic)

The Control Plane creates tenant instances using Cloud Run Admin API.
- **Must enforce** `--ingress=internal`
- **Must grant** `roles/run.invoker` ONLY to Control Plane Service Account

See [docs/examples/cloud-run-tenant-deployment.ts](../../docs/examples/cloud-run-tenant-deployment.ts) for programmatic deployment pattern.

## Scale-to-Zero Configuration

**CRITICAL**: All services must use `min-instances: 0`:
- Enables cost efficiency for idle tenants
- Cold start time must remain < 2 seconds
- Optimize container image size (< 200MB)

## Service Account Configuration

All Cloud Run services use the same service account:
- **Service Account**: `cloud-run-sa@vendin-store.iam.gserviceaccount.com`
- **Required Roles**:
  - `roles/secretmanager.secretAccessor` (for database URLs)
  - `roles/logging.logWriter`
  - `roles/monitoring.metricWriter`

## Domain Mapping

- **Control Plane**: `control.vendin.store`
- **Tenant Instances**: **NO direct domain mapping**. Accessed exclusively via **Control Plane Proxy**.

## Cleanup

When deleting a tenant, delete the Cloud Run service. See [docs/examples/cloud-run-tenant-deployment.ts](../../docs/examples/cloud-run-tenant-deployment.ts) for cleanup patterns.

## References

- **Service naming**: See [@references.md](../shared/references.md)
- **Provisioning workflow**: See [@provisioning.md](../apps/control-plane/provisioning.md)
- **Code examples**: See [docs/examples/](../../docs/examples/)
