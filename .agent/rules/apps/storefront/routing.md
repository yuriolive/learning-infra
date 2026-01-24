---
description: Hostname-based tenant routing patterns for storefront.
globs: apps/storefront/**/*
---
# Storefront Routing Patterns

**Critical**: The storefront **routes/proxies** requests to tenant backends. It is NOT a simple redirect service.

## Architecture Pattern

```
Customer Request → Storefront (Next.js)
                → Identifies tenant from hostname
                → Makes API call to tenant backend
                → Renders customer UI with data
```

The storefront maintains the customer-facing UI while communicating with the appropriate tenant's MedusaJS backend API.

## Hostname Resolution

The storefront must resolve tenants from incoming hostname.

See [docs/examples/hostname-routing.ts](../../../docs/examples/hostname-routing.ts) and [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) for implementation patterns.

## Routing Logic

### Root Domain (vendin.store)
- Serve landing page, signup form, marketing content
- No tenant resolution needed
- Signup form submits to Control Plane API

### Control Plane API (control.vendin.store)
- Should be handled by Cloud Run domain mapping, not storefront
- Return 404 if accessed via storefront

### Tenant Store ({store}.my.vendin.store)
- Resolve tenant from hostname
- If tenant not found or inactive, redirect to landing page or show suspended page
- For active tenants: **proxy API requests** to tenant instance
- Customer sees storefront UI, not MedusaJS default UI

### Admin Access ({store}.my.vendin.store/app)
- Direct to tenant's MedusaJS admin dashboard
- No storefront UI involvement
- Handled by Cloud Run routing

## Middleware Pattern (Next.js)

Use Next.js middleware for hostname-based routing. See [docs/examples/hostname-routing.ts](../../../docs/examples/hostname-routing.ts) for middleware implementation.

## Caching

- Cache tenant lookups (TTL: 5 minutes)
- Invalidate cache on tenant status changes
- Use Redis for distributed caching

## User Experiences Handled

### Customer Shopping Experience
1. Customer visits `merchant1.my.vendin.store`
2. Storefront resolves tenant ID from hostname
3. Storefront fetches products from `tenant-abc123` backend API
4. Storefront renders product listing UI
5. Customer adds to cart → API call to tenant backend
6. Customer checks out → API call to tenant backend

### Merchant Admin Experience
1. Merchant visits `merchant1.my.vendin.store/app`
2. Request goes directly to tenant Cloud Run service
3. MedusaJS Admin Dashboard loads
4. Storefront is NOT involved in admin experience

## References

- **Architecture**: See [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) for detailed request flows
- **Subdomain structure**: See [@project-overview.md](../../shared/project/project-overview.md)
- **Reserved subdomains**: See [@references.md](../../shared/references.md)
- **Code examples**: See [docs/examples/hostname-routing.ts](../../../docs/examples/hostname-routing.ts)
