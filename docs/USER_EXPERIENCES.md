# User Experiences

**Quick Reference**: Three distinct user experiences in the platform.

## 1. Platform Landing & Merchant Signup

**Who**: Prospective merchants looking to create a store  
**URL**: `vendin.store`  
**App**: Storefront (root route)

```
┌─────────────────────────────────────────────┐
│         CUSTOMER BROWSER                     │
│  https://vendin.store                        │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│   STOREFRONT (Cloudflare Pages)             │
│   - Marketing content                        │
│   - Pricing page                             │
│   - Signup form                              │
└──────────────┬──────────────────────────────┘
               │ (Signup submission)
               ▼
┌─────────────────────────────────────────────┐
│   CONTROL PLANE API                          │
│   - Create tenant                            │
│   - Provision database                       │
│   - Deploy Cloud Run service                 │
└─────────────────────────────────────────────┘
```

**Experience**: Static landing page with signup flow

---

## 2. Customer Shopping

**Who**: End customers shopping at a merchant's store  
**URL**: `{store}.my.vendin.store` or custom domain  
**App**: Storefront (customer UI) + Tenant Instance (backend API)

```
┌─────────────────────────────────────────────┐
│         CUSTOMER BROWSER                     │
│  https://merchant1.my.vendin.store           │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│   STOREFRONT (Cloudflare Pages)             │
│   - Identifies tenant from hostname          │
│   - Renders customer UI                      │
│     • Product listings                       │
│     • Cart                                   │
│     • Checkout                               │
└──────────────┬──────────────────────────────┘
               │ (API calls)
               ▼
┌─────────────────────────────────────────────┐
│   TENANT INSTANCE (Cloud Run)                │
│   tenant-abc123                              │
│   - MedusaJS Store API (/store)              │
│   - Returns product data, cart, orders       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│   NEON DATABASE                              │
│   merchant1-db                               │
│   - Products, orders, customers              │
└─────────────────────────────────────────────┘
```

**Experience**: Dynamic store with products, cart, and checkout

**Important**:

- Storefront **routes/proxies** API calls to tenant backend
- Storefront **renders** the customer UI
- NOT a simple redirect

---

## 3. Merchant Admin Management

**Who**: Merchant/store owner managing their store  
**URL**: `{store}.my.vendin.store/app`  
**App**: Tenant Instance (MedusaJS Admin)

```
┌─────────────────────────────────────────────┐
│         MERCHANT BROWSER                     │
│  https://merchant1.my.vendin.store/app       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│   TENANT INSTANCE (Cloud Run)                │
│   tenant-abc123                              │
│   - MedusaJS Admin Dashboard (/app)          │
│   - MedusaJS Admin API (/admin/*)            │
│     • Product management (CRUD)              │
│     • Order processing                       │
│     • Customer management                    │
│     • Store settings                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│   NEON DATABASE                              │
│   merchant1-db                               │
│   - Isolated tenant data                     │
└─────────────────────────────────────────────┘
```

**Experience**: MedusaJS admin dashboard for store management

**Important**:

- Each merchant has their **own isolated admin**
- Storefront does **NOT** intercept `/app` routes
- Direct connection from merchant to their tenant instance
- No shared platform admin for merchants

---

## URL Routing Summary

| URL Pattern                       | Handled By          | Purpose              | User                 |
| --------------------------------- | ------------------- | -------------------- | -------------------- |
| `vendin.store`                    | Storefront          | Landing page, signup | Prospective merchant |
| `control.vendin.store`            | Control Plane       | Provisioning API     | System (not public)  |
| `{store}.my.vendin.store`         | Storefront → Tenant | Customer shopping    | End customer         |
| `{store}.my.vendin.store/app`     | Tenant Instance     | Merchant admin       | Merchant/owner       |
| `{store}.my.vendin.store/admin/*` | Tenant Instance     | Admin API            | Admin dashboard      |
| `custom-domain.com`               | Storefront → Tenant | Customer shopping    | End customer         |
| `custom-domain.com/app`           | Tenant Instance     | Merchant admin       | Merchant/owner       |

---

## Key Architectural Points

### Storefront Role

- **Landing Page**: Serves marketing and signup at root domain
- **Customer UI**: Renders product pages, cart, checkout for tenants
- **Routing Proxy**: Identifies tenant and proxies API calls to correct backend
- **NOT a Redirector**: Maintains customer-facing UI while communicating with backends

### Tenant Instance Role

- **Store API** (`/store`): Serves product/cart/order data to storefront
- **Admin Dashboard** (`/app`): Serves merchant management interface
- **Admin API** (`/admin/*`): Serves admin API endpoints
- **Isolation**: Each tenant completely isolated (database + compute)

### Control Plane Role

- **Provisioning**: Creates new tenant infrastructure
- **Management**: Handles tenant lifecycle
- **Not Customer-Facing**: Internal system only

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture and diagrams
- [AGENTS.md](../AGENTS.md) - Agent responsibilities
- [@routing.md](../.agent/rules/apps/storefront/routing.md) - Storefront routing implementation
- [@medusajs.md](../.agent/rules/apps/tenant-instance/medusajs.md) - Tenant instance configuration
