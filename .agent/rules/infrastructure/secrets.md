---
description: GCP Secret Manager patterns and best practices.
globs: apps/**/*, infrastructure/**/*
---
# Secret Management Rules

## Secret Storage

- **Primary Provider**: Cloudflare Secrets Store (for Workers, Pages, and Control Plane)
- **Secondary Provider**: GCP Secret Manager (specifically for apps running in GCP like Tenant Instances)
- **Project**: `vendin-store`
- **Access**: Via `secrets_store_secrets` bindings (Cloudflare) or service account roles (GCP)

## Secret Naming Conventions

- **Control Plane**: `control-plane-db-url`
- **Tenant Databases**: `tenant-{tenantId}-db-url`
- **GitHub Secrets**: `NEXT_PUBLIC_POSTHOG_KEY`
- **GitHub Variables**: `NEXT_PUBLIC_POSTHOG_HOST`, `CLOUDFLARE_SECRETS_STORE_ID`

## Secret Creation Pattern

See [docs/examples/secret-management.ts](../../docs/examples/secret-management.ts) for secret creation and access patterns.

## Secret Access in Cloud Run

```yaml
# In Cloud Run deployment
secrets: |
  DATABASE_URL=projects/vendin-store/secrets/tenant-{tenantId}-db-url/versions/latest:ref
```

## Security Best Practices

- **NEVER** log secret values
- **NEVER** commit secrets to version control
- **ALWAYS** use Secret Manager for sensitive data
- **ALWAYS** use least-privilege access
- **ALWAYS** rotate secrets periodically
- **ALWAYS** use versioned secrets (`:latest` or specific version)

## Secret Rotation

- Rotate database passwords periodically
- Update secret versions in Cloud Run deployments
- Maintain old versions for rollback capability

## References

- **Code examples**: See [docs/examples/secret-management.ts](../../docs/examples/secret-management.ts)
- **Database provisioning**: See [@database.md](./database.md)
