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
**Apps**: **Shared Storefront** + Tenant Instance (API)

```
Customer → awesome-store-my.vendin.store
        → **Shared Storefront**
        → Middleware maps hostname to Tenant ID
        → UI fetches products from Tenant Instance API
        → Renders "Tenant A" themed experience
```

**Notes**:

- A single Next.js app serves ALL tenants
- Visuals (Logo, Colors) are injected via CSS Variables from Tenant Config

## 3. Merchant Admin

**User**: Merchant/store owner  
**Domain**: `{store}-my.vendin.store/app`  
**App**: Tenant Instance (MedusaJS)

```
Merchant → awesome-store-my.vendin.store/app
        → Authenticates with Medusa Backend
        → Manages products, orders, settings
```

**Notes**:

- Admin UI is embedded in the Medusa Backend
- Strictly isolated per tenant

## Related Documentation

- [Architecture Overview](./README.md)
- [Cloudflare Setup](../setup/CLOUDFLARE_SETUP.md)
- [Tenant Provisioning](../setup/TENANT_PROVISIONING_SETUP.md)
