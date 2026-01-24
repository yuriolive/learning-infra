---
description: Hostname-based tenant routing patterns for storefront.
globs: apps/storefront/**/*
---
# Storefront Routing Patterns

## Hostname Resolution

The storefront must resolve tenants from incoming hostname.

See [docs/examples/hostname-routing.ts](../../../docs/examples/hostname-routing.ts) for implementation patterns.

## Routing Logic

### Root Domain (vendin.store)
Serve landing page, signup form, marketing content.

### Control Plane API (control.vendin.store)
Should be handled by Cloud Run domain mapping, not storefront. Redirect or return 404.

### Tenant Store
Resolve tenant from hostname. If tenant not found or inactive, redirect to landing page or show suspended page. Route to tenant instance for active tenants.

## Middleware Pattern (Next.js)

Use Next.js middleware for hostname-based routing. See [docs/examples/hostname-routing.ts](../../../docs/examples/hostname-routing.ts) for middleware implementation.

## Caching

- Cache tenant lookups (TTL: 5 minutes)
- Invalidate cache on tenant status changes
- Use Redis for distributed caching

## References

- **Subdomain structure**: See [@project-overview.md](../../shared/project/project-overview.md)
- **Reserved subdomains**: See [@references.md](../../shared/references.md)
- **Code examples**: See [docs/examples/hostname-routing.ts](../../../docs/examples/hostname-routing.ts)
