---
description: MedusaJS 2.0 configuration and patterns for tenant instances.
globs: apps/tenant-instance/**/*
---
# MedusaJS 2.0 Patterns

## Configuration

Each tenant instance runs MedusaJS 2.0 with tenant-specific configuration.

## Environment Variables

- `DATABASE_URL`: Tenant-specific database connection (from Secret Manager)
- `TENANT_ID`: Unique tenant identifier
- `REDIS_NAMESPACE`: Redis namespace for tenant isolation
- `NODE_ENV`: `production`

## API Endpoints

- `/`: Custom storefront UI (customer experience)
- `/admin`: Admin dashboard and API (for merchants)
- `/store`: Store API (MedusaJS store API)
- `/health`: Health check endpoint

## Database Initialization

- MedusaJS schema is bootstrapped on first request or during provisioning
- Use MedusaJS migrations for schema updates
- Never share database connections between tenants

## Admin Access

- Merchants access admin at: `{store}-my.vendin.store/admin`
- Authentication handled by MedusaJS
- Each tenant has isolated admin access

## Store API

- Customers access the tenant storefront UI served by the tenant instance
- Storefront router redirects/proxies to the tenant instance
- Tenant instance serves `/store` API endpoints for the UI

## References

- **Database isolation**: See [AGENTS.md](../../../AGENTS.md#key-constraints)
- **Secret management**: See [@secrets.md](../../infrastructure/secrets.md)
