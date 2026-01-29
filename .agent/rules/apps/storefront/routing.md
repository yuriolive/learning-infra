---
description: Middleware-based tenant routing for Shared Storefront.
globs: apps/storefront/**/*
---
# Storefront Routing Rules

## Core Principle: Middleware-First

The Shared Storefront uses Next.js Middleware to handle multi-tenancy. **Never** hardcode tenant IDs or backend URLs.

## Rules

1.  **Hostname as Source of Truth**:
    - Always resolve context from the `Host` header.
    - Never rely on query params (e.g., `?tenant=123`) for public URLs.

2.  **Clean URLs**:
    - Public: `cool-store.com/products/hat`
    - Internal (Rewritten): `/_tenant/tenant_123/products/hat`
    - **Rule**: Users must NEVER see the internal URL structure.

3.  **Data Fetching**:
    - Server Components: Must read `tenantId` from the rewritten headers or path params.
    - Client Components: Must read `tenantId` from `TenantContext`.

4.  **404 Handling**:
    - If a hostname is not recognized, Rewrite to a generic "Store Not Found" or "Landing Page" (marketing).
    - Do not throw a 500 error.

## Headers

The Middleware should inject these headers for downstream use:
- `x-vendin-tenant-id`: The resolved ID.
- `x-vendin-backend-url`: The URL of the tenant's dedicated backend.
