# Shared Storefront Architecture

**Status**: Active  
**Type**: Single Next.js Application (Multi-Tenant)

This document outlines the architecture for the **Shared Storefront** that serves all tenants from a single deployment.

## 1. Core Logic: "The Shell"

The Storefront is a "Shell" that adapts its content and style based on the **Hostname**.

- **One Codebase**: `apps/storefront`
- **One Deployment**: Vercel / Cloudflare Pages
- **Many Tenants**: infinite scale

## 2. Request Lifecycle

1.  **Incoming Request**: `https://cool-shoes.vendin.store/products/sneakers`
2.  **Middleware (`middleware.ts`)**:
    - Detects Hostname: `cool-shoes.vendin.store`
    - Resolves Tenant ID: `tenant_123` (from Cache/Redis)
    - Rewrites URL: `/_mnt/tenant_123/products/sneakers` (internal routing)
    - Sets Header: `x-medusa-tenant-id: tenant_123`
3.  **Page Render (`server`)**:
    - Reads Tenant ID from headers/params.
    - Fetches **Tenant Config** (Name, Logo, Colors, Backend URL).
    - **Server-Side Data Fetching**: Generates OIDC Token -> Calls Private Backend directly.
4.  **Client Hydration**:
    - `TenantProvider` injects CSS Variables.
    - `MedusaProvider` configured to use **Local Proxy** (`/api/medusa`).

## 3. Connecting to Backends

The Storefront acts as a **Secure Gateway** to the backends.

- **Browser**: Talks to `https://store.com/api/medusa/*` (Storefront Proxy).
- **Storefront (Server)**:
  - Resolves Tenant Backend URL (e.g., `https://tenant-123.run.app`).
  - Generates **Google OIDC Token** (using Service Account).
  - Forwards request with `Authorization: Bearer <token>`.
- **Backend**: Private Cloud Run instance (Ingress: All, Auth: Required).

```typescript
// Example: Proxy Client (medusa-client.ts)
const medusa = new MedusaClient({
  baseUrl: "/api/medusa", // Proxies to private backend
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
});
```

## 4. Middleware & Routing

We use Next.js Middleware to keep URLs clean (`/products` instead of `/tenant/123/products`).

### Middleware Responsibilities

1.  **Hostname Normalization**: Handle `www`, custom domains, and subdomains.
2.  **Tenant Resolution**: Map `hostname` -> `tenant_id`.
3.  **Rewrites**: mask the internal multi-tenant routing structure.

## 5. Theming (CSS Variables)

We do not compile separate CSS per tenant. We use **Runtime Theming**.

- **Tailwind Config**: Uses CSS variables (e.g., `bg-primary` -> `var(--color-primary)`).
- **Injection**: `TenantProvider` writes these variables to the `<body>` tag style attribute on mount.

```tsx
<body style={{
  "--color-primary": tenant.colors.primary,
  "--font-heading": tenant.fonts.heading
}}>
```

- **Custom Themes**: For clients requiring drastically different layouts, we can use **Slot Pattern**:
  - Define `slots.Header`, `slots.ProductCard`.
  - Load specific components dynamically if the tenant config specifies a "Premium" theme.
