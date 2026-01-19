# Cursor Rules Organization

This directory contains Cursor AI rules that guide development practices for the Learning Infrastructure multi-tenant e-commerce platform.

## Directory Structure

```
.cursor/rules/
├── apps/                       # Application-specific rules
│   ├── control-plane/          # Control Plane (orchestrator) rules
│   │   ├── provisioning.mdc   # Tenant provisioning patterns
│   │   ├── api-development.mdc # Control Plane REST API patterns
│   │   └── domain-structure.mdc # Domain-driven design patterns
│   ├── storefront/            # Storefront application rules (future)
│   │   ├── routing.mdc        # Hostname-based tenant routing
│   │   └── frontend-development.mdc # Next.js patterns
│   └── tenant-instance/       # Tenant instance rules (future)
│       └── medusajs.mdc       # MedusaJS 2.0 patterns
├── infrastructure/            # Infrastructure-specific rules
│   ├── cloud-run.mdc         # Google Cloud Run deployment patterns
│   ├── cloudflare.mdc        # Cloudflare for SaaS patterns
│   ├── database.mdc          # Neon database provisioning patterns
│   └── secrets.mdc           # GCP Secret Manager patterns
├── packages/                  # Package-specific rules
│   ├── config-package.mdc    # Config package patterns
│   └── utils-package.mdc     # Utils package patterns
└── shared/                   # Rules applicable to all parts of the project
    ├── git/                  # Version control rules
    │   └── git-conventions.mdc # Conventional commits
    ├── project/              # Project-wide rules
    │   └── project-overview.mdc # Overview, tech stack, subdomain structure
    ├── quality/              # Code quality rules
    │   └── coding-standards.mdc # Coding standards and guidelines
    └── testing/              # Testing rules
        └── testing-strategy.mdc # Testing patterns and strategies
```

## Subdomain Structure

The platform uses the following subdomain structure:

```
vendin.store                    → Landing page & Signup (root domain)
www.vendin.store                → Redirects to root
control.vendin.store            → Control Plane API
admin.vendin.store              → Platform admin dashboard (optional)
*.my.vendin.store               → Tenant stores (wildcard)
  ├─ {store}.my.vendin.store → Merchant storefront
  └─ {store}.my.vendin.store/admin → Merchant admin (MedusaJS)
```

## Service Roles

**Control Plane** (Cloud Run):
- Single shared service managing all tenants
- Handles tenant provisioning, database creation, compute allocation
- API: control.vendin.store
- Location: apps/control-plane/

**Storefront** (Cloudflare Pages):
- Single shared Next.js application
- Routes requests to correct tenant based on hostname
- Handles landing page on root domain
- Location: apps/storefront/ (future)

**Tenant Instances** (Cloud Run):
- Separate Cloud Run service per tenant (tenant-{id})
- Each runs MedusaJS 2.0
- Serves /admin and /store APIs
- Scale-to-zero when idle
- Location: apps/tenant-instance/ (template, future)
