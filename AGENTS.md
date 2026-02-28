# AGENTS.md - Multi-Tenant E-commerce Platform

## Overview

This document describes the agent architecture and guidelines for AI assistants working on this multi-tenant e-commerce platform project.

## Project Architecture

### Core Components

1. **Control Plane (Orchestrator)**
   - Central API managing tenant provisioning
   - Handles merchant signup and store creation
   - Manages database and compute resource allocation
   - **Proxies requests to private Tenant Instances** (via Google IAM)
   - Location: `apps/control-plane/`

2. **Marketing App (Dashboard & Auth)**
   - Marketing site + **Unified Admin Dashboard**
   - Handles User Authentication (Better Auth)
   - **Proxies Admin requests** to Control Plane (via Service Bindings)
   - Root domain: `vendin.store`
   - Location: `apps/marketing/`

3. **Storefront Router**
   - Shared Next.js router (customer-facing)
   - Resolves tenant by hostname
   - **Proxies Store requests** to Tenant Instances (via SSR/API routes)
   - Location: `apps/storefront/`

4. **Tenant Instances (Individual Stores)**
   - Isolated MedusaJS 2.0 instances per tenant
   - **Private Cloud Run services** (Ingress: All, Auth: IAM)
   - Accessed securely via Control Plane Proxy
   - Each tenant has dedicated database and compute
   - Location: `apps/tenant-instance/` (template)

## Agent Responsibilities

### Control Plane Agent

- **Purpose**: Handle tenant provisioning, database creation, and resource management
- **Key Tasks**:
  - Integrate with Neon API for dynamic database creation
  - Provision Google Cloud Run services for new tenants
  - Manage tenant metadata and configuration
  - Handle tenant lifecycle (create, suspend, delete)

### Tenant Instance Agent

- **Purpose**: Configure and maintain individual MedusaJS store instances
- **Key Tasks**:
  - Set up MedusaJS 2.0 with tenant-specific configuration
  - Configure database connections (Neon PostgreSQL)
  - Set up Redis caching (Upstash)
  - Serve custom storefront UI per tenant
  - Implement tenant-specific customizations (themes, plugins)

### Storefront Agent

- **Purpose**: Build and maintain the shared router for tenant domains
- **Key Tasks**:
  - Implement hostname-based tenant routing
  - Redirect/proxy requests to tenant instances
  - Configure Cloudflare SaaS for custom domains
  - Optimize for edge deployment (Cloudflare Pages)

### Marketing App Agent

- **Purpose**: Build and maintain the marketing landing page
- **Key Tasks**:
  - Build landing, pricing, and signup pages
  - Maintain marketing content and CTAs
  - Optimize for edge deployment (Cloudflare Pages)

### Infrastructure Agent

- **Purpose**: Manage deployment, scaling, and infrastructure configuration
- **Key Tasks**:
  - Configure Google Cloud Run with scale-to-zero
  - Set up Cloudflare DNS and SSL automation
  - Manage Cloudflare R2 storage buckets
  - Implement monitoring and logging

## Key Constraints

### Non-Negotiables

1. **Multi-Instance Only**: Never use shared-database multi-tenancy
2. **Serverless Priority**: All components must be serverless
3. **TypeScript Only**: All backend code must be TypeScript
4. **Isolation**: 100% physical database isolation per merchant
5. **Private By Default**: Tenant Cloud Run instances must have **Ingress: All** (Public) but require **IAM Authentication** (no unauthenticated access).

### Performance Requirements

- Store provisioning: < 2 minutes end-to-end
- Scale-to-zero: Cloud Run `min-instances: 0`
- Database: Neon Serverless PostgreSQL per tenant

## Technology Stack

### Backend

- **Framework**: MedusaJS 2.0+
- **Language**: TypeScript
- **Database**: Neon Serverless PostgreSQL
- **Cache**: Upstash Redis (Serverless)

### Infrastructure

- **Compute**: Google Cloud Run
- **Frontend Hosting**: Cloudflare Pages
- **DNS/SSL**: Cloudflare for SaaS
- **Storage**: Cloudflare R2
- **Analytics/Monitoring**: PostHog

### Future Additions

- **Search**: Meilisearch (Milestone 5)

## Development Guidelines

### Code Organization

```
/
├── apps/
│   ├── control-plane/      # Orchestrator API
│   ├── marketing/          # Marketing landing app (root domain)
│   ├── storefront/         # Router-only storefront (tenant domains)
│   └── tenant-instance/    # MedusaJS template/boilerplate
├── packages/               # Shared utilities/types
└── docs/                   # Architecture and setup guides
```

### Database Strategy

- Each tenant gets a dedicated Neon database
- Use Neon API for programmatic database creation
- Store connection strings securely (environment variables or secrets manager)
- Never share database connections between tenants

### File Naming

- **Strictly use `kebab-case`** for all filenames (e.g., `step-card.tsx`, `hero-section.tsx`).
- **DO NOT** use PascalCase (e.g., `StepCard.tsx`) or camelCase.
- This rule applies to all files, including React components, utilities, and configuration files.

### Monorepo Build Gotchas

These issues have caused build/typecheck failures before — keep them in mind when modifying packages or CI:

1. **NodeNext requires explicit `.js` extensions** in all relative imports and re-exports within `src/` files (even though the source is `.ts`). Missing extensions cause `TS2307` errors at build time.

   ```ts
   // ✅ correct
   export * from "./pino-logger.js";
   // ❌ wrong — fails under NodeNext
   export * from "./pino-logger";
   ```

2. **Internal packages need a `types` condition in `exports`** (`package.json`) for strict NodeNext to resolve types without building first:

   ```json
   "exports": { ".": { "types": "./src/index.ts", "import": "./dist/index.js" } }
   ```

   Setting only a top-level `"types"` field is not sufficient — the `exports` map takes precedence.

3. **Avoid `rootDir: "./src"` in packages that import other workspace packages.** If any resolved file lives outside `src/` (e.g., type resolution climbing into a sibling package), TypeScript will emit `TS6059`. Omit `rootDir` and let `outDir` alone control output.

4. **Use `tsc`, not `tsc -b`, for single-project builds.** `tsc -b` is the project-references build mode — it requires `composite: true` and `references: []` in the tsconfig to work correctly. Without them, `tsc -b` can silently succeed in CI without emitting any files (because it sees nothing to build). This causes downstream steps like `copyFileSync('dist/medusa-config.js', ...)` to fail with `ENOENT` on a fresh checkout but pass locally (where `dist/` already exists from a previous run).

   ```diff
   - "build": "tsc -b && ..."   # ❌ silently no-ops in CI without composite/references
   + "build": "tsc && ..."      # ✅ always compiles the project
   ```

   ```sh
   # ✅ Turbo v2
   turbo prune @vendin/tenant-instance --docker
   # ❌ removed in v2
   turbo prune --scope=@vendin/tenant-instance --docker
   ```

5. **Avoid shell-specific commands (`cp`, `rm`) in `package.json` scripts** — they fail on Windows. Use Node.js one-liners instead:

   ```json
   "node -e \"require('fs').copyFileSync('src','dst')\""
   ```

6. **Regenerate `out/` before every local Docker build.** The `out/` directory is produced by `turbo prune` and is **not** auto-updated. A stale `out/` causes silent missing-package failures inside the container. Always run:
   ```sh
   npx turbo prune @vendin/tenant-instance --docker
   docker build -f apps/tenant-instance/Dockerfile .
   ```
   In CI this is handled automatically by the `deploy-tenant-instance.yml` workflow.

### API Design

### API Design

- **Control Plane API**: RESTful endpoints + **Proxy Routes** (`/proxy/:tenantId/*`)
- **Marketing App**: Internal API routes (`/api/admin/*`) proxying to Control Plane
- **Tenant API**: Private MedusaJS endpoints (accessed via Proxy)
- **Storefront API**: Next.js API routes for tenant resolution & proxying

### Environment Variables

- Control Plane: `NEON_API_KEY`, `GCP_PROJECT_ID`, `CLOUDFLARE_API_TOKEN`, `POSTHOG_API_KEY`
- Tenant Instances: `DATABASE_URL`, `REDIS_URL`, `TENANT_ID`
- Storefront/Marketing: `CONTROL_PLANE_API_URL`, `CLOUDFLARE_ACCOUNT_ID`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

## Testing Strategy

### Unit Tests

- Test tenant provisioning logic
- Test database connection handling
- Test hostname routing logic

### Integration Tests

- Test end-to-end store creation flow
- Test tenant isolation
- Test custom domain routing

### Performance Tests

- Verify < 2 minute provisioning time
- Test scale-to-zero behavior
- Load test multi-tenant routing

## Security Considerations

1. **Tenant Isolation**: Enforce strict database isolation
2. **API Security**: Implement authentication and authorization
3. **Secrets Management**: Use secure secret storage (GCP Secret Manager or similar)
4. **Network Security**: Configure proper firewall rules and VPC settings
5. **SSL/TLS**: Automate SSL certificate provisioning via Cloudflare

## Deployment Workflow

1. **Merchant Signup** → Control Plane receives request
2. **Database Creation** → Neon API creates new database
3. **Compute Provisioning** → Google Cloud Run service created
4. **DNS Configuration** → Cloudflare SaaS configures domain
5. **Store Initialization** → MedusaJS instance bootstrapped
6. **Verification** → Health checks confirm store is live

## Common Agent Tasks

### Adding a New Feature

1. Identify which component(s) need changes
2. Consider multi-tenant implications
3. Ensure isolation is maintained
4. Update relevant tests
5. Document API changes

### Debugging Issues

1. Identify tenant context (if applicable)
2. Check logs in appropriate service
3. Verify database isolation
4. Check infrastructure configuration
5. Review routing logic (for storefront issues)

### Performance Optimization

1. Monitor Cloud Run cold start times
2. Optimize database queries
3. Implement proper caching strategies
4. Review scale-to-zero configuration
5. Optimize Next.js edge functions

### Documentation and Research

- **Use context7 MCP** (if available) to search for up-to-date documentation and code examples
- Search for library-specific documentation before implementing new features
- Look for best practices and patterns in official documentation
- Verify API changes and breaking changes in library versions
- Find code examples and implementation patterns
- Use context7 for: MedusaJS 2.0, Neon API, Google Cloud Run, Cloudflare for SaaS, Next.js edge functions, Upstash Redis
- Prefer context7 over web searches for library-specific documentation

## Resources

- [MedusaJS Documentation](https://docs.medusajs.com/)
- [Neon API Documentation](https://neon.tech/docs/api)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)

## Notes for AI Assistants

- Proactively manage GitHub project tasks and issues.
- Always maintain tenant isolation as the highest priority
- Prefer serverless solutions over traditional infrastructure
- Use TypeScript for all backend code
- Follow the multi-instance provisioning model strictly
- Consider scale-to-zero implications in all designs
- Test provisioning time to ensure < 2 minute requirement
- **Use context7 MCP server** (if available) for documentation searches (see Documentation and Research section above)
