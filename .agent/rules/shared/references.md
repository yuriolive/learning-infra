---
description: Common patterns and naming conventions referenced across rules.
globs: **/*
---
# Shared References

Common patterns and naming conventions used across the project.

## Service Naming Conventions

### Control Plane Service
- **Service Name**: `control-plane`
- **Type**: Shared service (one instance for all tenants)

### Tenant Instance Services
- **Pattern**: `tenant-{tenantId}`
- **Examples**: `tenant-abc123`, `tenant-xyz789`
- **Uniqueness**: Tenant ID ensures uniqueness

## Reserved Subdomains

These subdomains are reserved for platform services:
- `www` - Redirects to root
- `control` - Control Plane API
- `admin` - Platform admin dashboard
- `mail`, `ftp` - Infrastructure services

## References

- **Subdomain structure**: See [@project-overview.md](./project/project-overview.md)
- **Architecture**: See [AGENTS.md](../../../AGENTS.md)
- **Tenant isolation**: See [AGENTS.md](../../../AGENTS.md#key-constraints)
