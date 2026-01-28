# Multi-Tenant Storefront Architecture

This document outlines the strategy for serving multiple tenants from a single **Next.js Storefront** deployment.

## 1. Core Principle: Single Deployment, Dynamic Context

We do **not** build separate frontends for each tenant. Instead, we deploy a single "Shell" application that adapts its content, logic, and theme based on the request's hostname.

### Flow Overview

1.  **Request**: User visits `acme.vendin.store`
2.  **Middleware**: Intercepts request, parses hostname, resolves `tenantId`.
3.  **Data Fetch**: Server Component fetches Tenant Config (colors, backend URL) from Control Plane.
4.  **Hydration**: Root Layout injects Tenant Config into a Client Context provider.
5.  **Render**: UI components read from Context to style themselves and fetch data.

---

## 2. Technical Implementation

### 2.1 Middleware (`middleware.ts`)

The middleware is the entry point. It handles the **Routing Strategy**.

- **Subdomains**: `*.vendin.store` -> Extract subdomain as `tenantId`.
- **Custom Domains**: `www.acmeshop.com` -> Lookup `tenantId` via Control Plane (Redis/Cache).

The middleware rewrites the URL to include the tenant ID for internal routing, e.g., `/acme/products`, but keeps the user-facing URL clean.

### 2.2 Tenant Context (`TenantProvider`)

We create a React Context to make tenant data available app-wide.

```tsx
// src/providers/tenant-provider.tsx
"use client";

const TenantContext = createContext<Tenant | null>(null);

export function TenantProvider({ tenant, children }) {
  // 1. Apply CSS Variables for Theming
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary",
      tenant.colors.primary,
    );
    document.documentElement.style.setProperty(
      "--font-main",
      tenant.fonts.body,
    );
  }, [tenant]);

  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  );
}
```

### 2.3 Dynamic API Client (`useMedusa`)

Accessing the correct backend is critical. Standard Medusa clients expect a static `baseUrl`. We must wrap this.

```tsx
// src/lib/medusa-client.ts
export function useMedusa() {
  const { backendUrl } = useTenant();

  // Returns a client instance configured for THIS tenant
  return useMemo(() => new MedusaClient({ baseUrl: backendUrl }), [backendUrl]);
}
```

---

## 3. Theming & Customization

### 3.1 CSS Variables

We use CSS variables for all design tokens (colors, spacing, fonts).

- `globals.css` defines **defaults** (fallback).
- `TenantProvider` overrides these values at runtime based on the fetched configuration.

### 3.2 Component Overrides (Advanced)

For clients requiring drastically different layouts, we can use **Slot Pattern**:

- Define `slots.Header`, `slots.ProductCard`.
- Load specific components dynamically if the tenant config specifies a "Premium" theme.

---

## 4. Build & Deployment

- **Build**: One single build. `pnpm build`.
- **Deploy**: To Cloudflare Pages / Vercel.
- **Scale**: CDNs handle the asset caching. Since the app is just a shell, it scales indefinitely.
