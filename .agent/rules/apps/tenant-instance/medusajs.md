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

- `/app`: Admin dashboard (MedusaJS 2.0 admin UI for merchants)
- `/admin/*`: Admin API endpoints (used by admin dashboard)
- `/store`: Store API (for customers via storefront)
- `/health`: Health check endpoint

## Database Initialization

- MedusaJS schema is bootstrapped on first request or during provisioning
- Use MedusaJS migrations for schema updates
- Never share database connections between tenants

## Admin Access

- Merchants access admin dashboard at: `{store}.my.vendin.store/app`
- Admin API endpoints at: `{store}.my.vendin.store/admin/*`
- Authentication handled by MedusaJS JWT
- Each tenant has isolated admin access
- Storefront does NOT intercept `/app` or `/admin` routes

## Store API

- Customers access store via storefront routing
- Storefront proxies requests to tenant instance
- Tenant instance serves `/store` API endpoints

## References

- **Architecture**: See [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) for request flows
- **Database isolation**: See [AGENTS.md](../../../../AGENTS.md#key-constraints)
- **Secret management**: See [@secrets.md](../../infrastructure/secrets.md)
