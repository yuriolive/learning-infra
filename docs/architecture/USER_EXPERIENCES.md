# User Experiences

**Last Updated**: 2026-01-23
**Status**: Active

This document outlines the three distinct user experiences in the platform.

## 1. Marketing Landing & Signup

**User**: Prospective merchants
**Domain**: `vendin.store`
**App**: Marketing app (`apps/marketing/`)

```
Customer → vendin.store
        → Marketing app (Cloudflare Pages)
        → Landing page, pricing, signup
        → Signup submits to Control Plane
```

**Notes**:

- The marketing site is **separate** from the storefront router
- No tenant resolution happens here

## 2. Customer Shopping (Tenant Store)

**User**: End customers
**Domain**: `{store}-my.vendin.store` or custom domain
**Apps**: Storefront router + Tenant instance

```
Customer → awesome-store-my.vendin.store
        → Storefront router (Cloudflare Pages)
        → Resolve tenant by hostname
        → Redirect/proxy to tenant-{id}
        → Tenant instance serves custom storefront UI + APIs
```

**Notes**:

- Each tenant can have **custom themes and storefront UI**
- Storefront router **does not render** customer UI

## 3. Merchant Admin

**User**: Merchant/store owner
**Domain**: `{store}-my.vendin.store/admin`
**App**: Tenant instance (MedusaJS)

```
Merchant → awesome-store-my.vendin.store/admin
        → Storefront router
        → Tenant instance (MedusaJS admin UI + API)
```

**Notes**:

- Admin UI is served directly by the tenant instance
- Each tenant has isolated admin access and data

## Related Documentation

- [Architecture Overview](./README.md)
- [Cloudflare Setup](../setup/CLOUDFLARE_SETUP.md)
- [Tenant Provisioning](../setup/TENANT_PROVISIONING_SETUP.md)
