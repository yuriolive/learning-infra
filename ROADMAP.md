# Roadmap: Multi-Tenant E-commerce Platform

## Overview

This roadmap organizes all development tasks into phases aligned with the PRD priorities. Tasks are grouped by monorepo component (`apps/control-plane/`, `apps/tenant-instance/`, `apps/storefront/`, `infrastructure/`, `packages/`) within each phase, with explicit dependencies similar to Turborepo task configuration.

**Package Manager**: This project uses [PNPM](https://pnpm.io) for package management and script execution. All commands should use `pnpm` instead of `npm` or `yarn`.

## Monorepo Structure

```
/
├── apps/
│   ├── control-plane/      # Orchestrator API (tenant provisioning)
│   ├── tenant-instance/     # MedusaJS template/boilerplate
│   └── storefront/          # Next.js multi-tenant storefront
├── packages/
│   ├── config/              # Shared config (ESLint, TS, Prettier)
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Shared utilities
│   └── test-utils/          # Shared testing utilities
└── infrastructure/          # Infrastructure as Code
```

## Task Dependencies

Tasks follow dependency patterns similar to `turbo.json`:

- `^build` = depends on upstream packages/apps
- Sequential dependencies shown with `→`
- Parallel tasks can be executed concurrently

## Phase 1: MVP (P0 - Core Platform)

**Goal**: Single tenant can be provisioned end-to-end in < 2 minutes

**Success Criteria**: Successfully provision 10 test tenants with isolated databases

### `apps/control-plane/` - Orchestrator API

**Dependencies**: None (foundation component)

- [ ] **Control Plane API Foundation** (`apps/control-plane/src/api/`)
  - RESTful API with tenant provisioning endpoints
  - POST /api/tenants (create new tenant)
  - GET /api/tenants/:tenantId (get tenant details)
  - DELETE /api/tenants/:tenantId (soft delete with cleanup)
  - Tenant metadata storage (PostgreSQL or similar)
  - Request validation and error handling
  - **Depends on**: `^build` (packages)

- [ ] **Database Tooling** (`apps/control-plane/src/database/`)
  - Drizzle ORM schema for tenant metadata
  - Database factory pattern (connection management)
  - Migration system (Drizzle Kit)
  - Database initialization scripts
  - Connection pooling configuration
  - **Depends on**: Control Plane API Foundation

- [ ] **Development Tooling** (`apps/control-plane/`)
  - PNPM package.json scripts (dev, build, test, lint, typecheck)
  - Vitest configuration (unit + integration)
  - ESLint configuration
  - TypeScript configuration (strict mode)
  - Drizzle config for migrations
  - PNPM workspaces configuration
  - **Depends on**: Control Plane API Foundation

- [ ] **Proxy Access Implementation** (`apps/control-plane/src/proxy/`)
  - Internal Proxy Hono App (Service Binding target)
  - IAM-authenticated requests to Cloud Run
  - Proxy route implementation (`/proxy/:tenantId/*`)
  - Error handling and timeouts
  - **Depends on**: Cloud Run Deployment Automation, Development Tooling

- [ ] **Testing Infrastructure** (`apps/control-plane/tests/`)
  - Unit test setup (Vitest)
  - Integration test setup
  - Test database factory (isolated per test)
  - Test utilities and helpers
  - Coverage configuration
  - **Depends on**: Database Tooling, Development Tooling

- [ ] **Neon Database Automation** (`apps/control-plane/src/providers/neon/`)
  - Neon API integration for database creation
  - Automated database provisioning per tenant
  - Connection string generation and secure storage
  - Database deletion/cleanup on tenant removal
  - Error handling and retry logic
  - **Depends on**: Control Plane API Foundation

- [ ] **Cloud Run Deployment Automation** (`apps/control-plane/src/providers/gcp/`)
  - Automated Cloud Run service creation per tenant
  - Container image building and deployment
  - Scale-to-zero configuration (min-instances: 0)
  - **Private Access Configuration** (`ingress: all`, `--no-allow-unauthenticated`)
  - Environment variable injection
  - Health check configuration
  - **Depends on**: Neon Database Automation

- [ ] **Tenant Isolation Verification** (`apps/control-plane/src/audit/`)
  - Audit tooling to verify database isolation
  - Automated isolation tests
  - Connection string validation
  - Security checks for cross-tenant access prevention
  - **Depends on**: Control Plane API Foundation

- [ ] **Rollback Mechanism** (`apps/control-plane/src/provisioning/`)
  - Failed provisioning cleanup
  - Resource deletion on errors
  - Audit logging for all provisioning attempts
  - Partial rollback support
  - **Depends on**: Neon Database Automation, Cloud Run Deployment

### `tenant-instance/` - MedusaJS Template

**Dependencies**: `^build` (shared packages), Control Plane API (for provisioning)

- [ ] **MedusaJS 2.0 Template Setup** (`tenant-instance/`)
  - Base MedusaJS 2.0 configuration
  - TypeScript strict mode configuration
  - Database connection setup (Neon PostgreSQL)
  - Redis caching setup (Upstash)
  - Environment variable management
  - **Depends on**: `^build` (packages/config, packages/utils)

- [ ] **Database Tooling** (`apps/tenant-instance/src/database/`)
  - Drizzle ORM schema setup
  - Database factory pattern (connection management)
  - Migration system (Drizzle Kit)
  - Database initialization scripts
  - Connection pooling configuration
  - **Depends on**: MedusaJS 2.0 Template Setup

- [ ] **Development Tooling** (`apps/tenant-instance/`)
  - PNPM package.json scripts (dev, build, test, lint, typecheck)
  - Vitest configuration (unit + integration)
  - ESLint configuration
  - TypeScript configuration (strict mode)
  - Drizzle config for migrations
  - PNPM workspaces configuration
  - **Depends on**: MedusaJS 2.0 Template Setup

- [ ] **Testing Infrastructure** (`apps/tenant-instance/tests/`)
  - Unit test setup (Vitest)
  - Integration test setup
  - Test database factory (isolated per test)
  - Test utilities and helpers
  - Coverage configuration
  - **Depends on**: Database Tooling, Development Tooling

- [ ] **Authentication & Proxy** (`apps/marketing/src/app/api/admin/`) [MOVED FROM TENANT INSTANCE]
  - **Unified Authentication**: Better Auth integration in Marketing App
  - **Admin Proxy Route**: Next.js API route proxying to Control Plane
  - **Service Binding**: Configuration for `control-plane` binding
  - Secure session management
  - **Depends on**: Control Plane Proxy Access Implementation

- [ ] **Basic Admin Dashboard** (`apps/tenant-instance/src/admin/`)
  - Product catalog management (CRUD)
  - Order processing interface
  - Customer management
  - Basic store settings
  - **Depends on**: Authentication & Authorization

### `apps/storefront/` - Multi-Tenant Next.js

**Dependencies**: `^build` (packages), Tenant Instance API

- [ ] **Multi-Tenant Storefront Application** (`apps/storefront/`)
  - Next.js setup with App Router
  - Hostname-based tenant resolution (Middleware)
  - Dynamic API Client Factory (Targets correct tenant backend)
  - Tenant Context Provider (Injects name, logo, theme)
  - CSS Variables for dynamic theming
  - **Depends on**: `^build` (packages), Control Plane API (for tenant lookup)

- [ ] **Core Storefront Features** (`apps/storefront/src/app/`)
  - Product listing and details
  - Shopping cart functionality
  - Checkout flow integration
  - **Depends on**: Multi-Tenant Storefront Application, Tenant Instance API

### `infrastructure/` - Infrastructure as Code

**Dependencies**: All components (deploys them)

- [ ] **Basic Monitoring & Health Checks** (`infrastructure/monitoring/`)
  - Health check endpoints
  - Basic logging setup
  - Provisioning time tracking
  - Error rate monitoring
  - **Depends on**: Control Plane API, Tenant Instance

- [ ] **CI/CD Pipeline** (`infrastructure/ci/`)
  - Control Plane deployment pipeline (using PNPM)
  - Tenant template build pipeline (using PNPM)
  - Storefront deployment to Cloudflare Pages
  - Automated testing (using PNPM scripts)
  - PNPM installation in CI environment
  - **Depends on**: `^build` (all apps and packages)

### `packages/` - Shared Packages

**Dependencies**: None (foundation for all)

- [ ] **Config Package** (`packages/config/`)
  - Shared ESLint configuration
  - Shared TypeScript configuration
  - Shared Prettier configuration
  - Base configs extended by all apps
  - **Depends on**: None

- [ ] **Types Package** (`packages/types/`)
  - Tenant metadata types
  - API contract types
  - Configuration types
  - Shared TypeScript interfaces
  - **Depends on**: None

- [ ] **Utils Package** (`packages/utils/`)
  - Tenant resolution utilities
  - Validation helpers
  - Error handling utilities
  - Common utility functions
  - **Depends on**: None

- [ ] **Test Utils Package** (`packages/test-utils/`)
  - Test database factory
  - Test client utilities
  - Mock data generators
  - Test setup helpers
  - **Depends on**: Types Package, Utils Package

---

## Phase 2: Production Ready (P1)

**Goal**: Platform supports 100+ production tenants reliably

**Success Criteria**: 99% provisioning success rate, < 3 minute provisioning time

### `apps/control-plane/` - Orchestrator API

- [ ] **Custom Domain Support** (`apps/control-plane/src/domains/`)
  - POST /api/tenants/:tenantId/domains endpoint
  - DNS configuration instructions
  - Domain verification logic
  - Custom domain metadata storage
  - **Depends on**: Control Plane API Foundation (Phase 1)

- [ ] **SSL Automation via Cloudflare for SaaS** (`apps/control-plane/src/providers/cloudflare/`)
  - Cloudflare for SaaS integration
  - Automatic SSL certificate provisioning
  - Certificate renewal automation
  - SSL status monitoring
  - **Depends on**: Custom Domain Support

- [ ] **Enhanced Tenant Management** (`apps/control-plane/src/management/`)
  - Tenant suspension/activation
  - Tenant metrics endpoint (GET /api/tenants/:tenantId/metrics)
  - Usage tracking (requests, storage, database size)
  - Tenant status management
  - **Depends on**: Control Plane API Foundation (Phase 1)

- [ ] **Comprehensive Monitoring** (`apps/control-plane/src/monitoring/`)
  - Structured logging with tenant context
  - Metrics collection (Prometheus-compatible)
  - Distributed tracing setup
  - Real-time alerting system
  - **Depends on**: Basic Monitoring (Phase 1)

### `apps/tenant-instance/` - MedusaJS Template

- [ ] **Scale-to-Zero Optimization** (`apps/tenant-instance/optimization/`)
  - Cold start optimization (< 2 seconds)
  - Container image size optimization (< 200MB)
  - Pre-warming strategies
  - Connection pooling optimization
  - **Depends on**: MedusaJS 2.0 Template Setup (Phase 1)

- [ ] **Performance Optimization** (`apps/tenant-instance/optimization/`)
  - Database query optimization
  - Redis caching strategies
  - API response time optimization (p95 < 200ms)
  - Index optimization
  - **Depends on**: MedusaJS 2.0 Template Setup (Phase 1)

- [ ] **Security Hardening** (`apps/tenant-instance/src/security/`)
  - Security audit implementation
  - Penetration testing
  - TLS 1.3 enforcement
  - Secrets management (GCP Secret Manager)
  - Audit logging for admin actions
  - **Depends on**: Authentication & Authorization (Phase 1)

### `apps/storefront/` - Multi-Tenant Next.js

- [ ] **Custom Domain Routing** (`apps/storefront/src/middleware/`)
  - Cloudflare for SaaS integration
  - Custom domain hostname resolution
  - Fallback to subdomain on failure
  - Apex and subdomain support
  - **Depends on**: Multi-Tenant Next.js Application (Phase 1), SSL Automation

- [ ] **Performance Optimization** (`apps/storefront/optimization/`)
  - Edge caching configuration
  - CDN optimization
  - Image optimization
  - Storefront load time < 1 second
  - **Depends on**: Basic Storefront Features (Phase 1)

### `infrastructure/` - Infrastructure as Code

- [ ] **Automated Backups & Disaster Recovery** (`infrastructure/backups/`)
  - Daily automated database backups
  - Point-in-time recovery (PITR)
  - Backup verification
  - Disaster recovery procedures
  - **Depends on**: Neon Database Automation (Phase 1)

- [ ] **Comprehensive Alerting** (`infrastructure/alerting/`)
  - Critical alerts (provisioning failures, data leaks)
  - Warning alerts (performance degradation)
  - Informational alerts (new tenants, domain additions)
  - Alert routing and escalation
  - **Depends on**: Basic Monitoring (Phase 1)

- [ ] **Documentation** (`docs/`)
  - API documentation (Control Plane)
  - Deployment runbooks (PNPM commands)
  - Troubleshooting guides
  - Merchant onboarding documentation
  - Developer setup guides (PNPM installation and usage)
  - **Depends on**: All Phase 1 components

---

## Phase 3: Enhanced Features (P2)

**Goal**: Platform scales to 1,000+ tenants with improved performance

**Success Criteria**: Enhanced performance metrics, advanced features operational

### `apps/control-plane/` - Orchestrator API

- [ ] **Advanced Analytics Dashboard** (`apps/control-plane/src/analytics/`)
  - Tenant usage analytics
  - Cost tracking per tenant
  - Performance metrics visualization
  - Business intelligence features
  - **Depends on**: Enhanced Tenant Management (Phase 2)

- [ ] **Automated Scaling Policies** (`apps/control-plane/src/scaling/`)
  - Usage pattern analysis
  - Predictive scaling
  - Resource optimization recommendations
  - Cost optimization tools
  - **Depends on**: Comprehensive Monitoring (Phase 2)

### `apps/tenant-instance/` - MedusaJS Template

- [ ] **Full-Text Search Integration** (`apps/tenant-instance/src/search/`)
  - Meilisearch integration
  - Product search functionality
  - Search index management
  - Search performance optimization
  - **Depends on**: Performance Optimization (Phase 2)

- [ ] **Advanced Caching Strategies** (`apps/tenant-instance/src/cache/`)
  - Edge caching implementation
  - CDN optimization
  - Cache invalidation strategies
  - Multi-layer caching
  - **Depends on**: Performance Optimization (Phase 2)

- [ ] **Advanced Performance Optimization** (`apps/tenant-instance/optimization/`)
  - Query optimization (advanced)
  - Database indexing strategies
  - Connection pool tuning
  - Response time optimization
  - **Depends on**: Performance Optimization (Phase 2)

### `apps/storefront/` - Multi-Tenant Next.js

- [ ] **A/B Testing Framework** (`apps/storefront/src/experiments/`)
  - Experimentation infrastructure
  - Feature flag system
  - Analytics integration
  - Conversion tracking
  - **Depends on**: Performance Optimization (`apps/storefront/`, Phase 2)

- [ ] **Advanced Storefront Features** (`apps/storefront/src/features/`)
  - Enhanced product filtering
  - Recommendation engine integration
  - Advanced checkout options
  - Customer account features
  - **Depends on**: Basic Storefront Features (Phase 1)

### `infrastructure/` - Infrastructure as Code

- [ ] **Multi-Region Support** (`infrastructure/regions/`)
  - Regional database provisioning
  - Data residency compliance
  - Cross-region replication (if needed)
  - Regional performance optimization
  - **Depends on**: Comprehensive Monitoring (Phase 2)

- [ ] **Advanced Monitoring** (`infrastructure/monitoring/`)
  - Custom dashboards
  - Advanced alerting rules
  - Performance profiling
  - Cost analysis tools
  - **Depends on**: Comprehensive Monitoring (Phase 2)

---

## Phase 4: Enterprise Features (P3)

**Goal**: Enterprise-grade platform with advanced capabilities

**Success Criteria**: Enterprise features operational, white-label support

### `apps/control-plane/` - Orchestrator API

- [ ] **White-Label Capabilities** (`apps/control-plane/src/white-label/`)
  - Custom branding per tenant
  - White-label admin interface
  - Custom domain branding
  - Brand asset management
  - **Depends on**: Custom Domain Support (Phase 2)

- [ ] **Advanced Integrations** (`apps/control-plane/src/integrations/`)
  - ERP system integrations
  - CRM integrations
  - Third-party API management
  - Webhook management system
  - **Depends on**: Enhanced Tenant Management (Phase 2)

### `apps/tenant-instance/` - MedusaJS Template

- [ ] **Multi-Language Support** (`apps/tenant-instance/src/i18n/`)
  - Internationalization (i18n)
  - Multi-currency support
  - Regional compliance features
  - Localization tools
  - **Depends on**: Basic Admin Dashboard (Phase 1)

- [ ] **Advanced Marketing Automation** (`apps/tenant-instance/src/marketing/`)
  - Email campaign management
  - Marketing automation workflows
  - Customer segmentation
  - Promotional tools
  - **Depends on**: Basic Admin Dashboard (Phase 1)

### `apps/storefront/` - Multi-Tenant Next.js

- [ ] **Mobile Applications** (`apps/storefront/mobile/`)
  - iOS application
  - Android application
  - Mobile API optimization
  - Push notification support
  - **Depends on**: Advanced Storefront Features (Phase 3)

- [ ] **Advanced E-commerce Features** (`apps/storefront/src/features/`)
  - Gift cards and vouchers
  - Loyalty programs
  - Advanced discount rules
  - Subscription management
  - **Depends on**: Basic Storefront Features (Phase 1)

### `infrastructure/` - Infrastructure as Code

- [ ] **Machine Learning Features** (`infrastructure/ml/`)
  - Product recommendations
  - Fraud detection
  - Demand forecasting
  - Personalization engine
  - **Depends on**: Advanced Analytics Dashboard (Phase 3)

- [ ] **Enterprise Security** (`infrastructure/security/`)
  - Advanced threat detection
  - Compliance certifications
  - Advanced audit logging
  - Security incident response
  - **Depends on**: Security Hardening (Phase 2)

---

## Cross-Phase Tasks

### Development Tooling (All Phases)

- [ ] **Monorepo Setup** (Root)
  - Turborepo configuration (`turbo.json`)
  - PNPM workspaces configuration (`package.json`)
  - Root package.json with PNPM scripts
  - Shared build scripts (using PNPM)
  - Dependency management (PNPM lockfile)
  - **Depends on**: None (foundation)

- [ ] **Shared Testing Utilities** (`packages/test-utils/`)
  - Test database factory
  - Test client utilities
  - Mock data generators
  - Test setup helpers
  - **Depends on**: Monorepo Setup

### Testing & Quality Assurance

- [ ] **Unit Tests** (Per Component)
  - Control Plane API tests (`apps/control-plane/tests/unit/`)
  - Tenant Instance tests (`apps/tenant-instance/tests/unit/`)
  - Storefront component tests (`apps/storefront/tests/unit/`)
  - Database isolation tests
  - Routing logic tests
  - **Depends on**: Testing Infrastructure (each component)

- [ ] **Integration Tests** (Per Component)
  - End-to-end store creation flow (`apps/control-plane/tests/integration/`)
  - Tenant API integration tests (`apps/tenant-instance/tests/integration/`)
  - Storefront routing tests (`apps/storefront/tests/integration/`)
  - Tenant isolation verification
  - Custom domain routing tests
  - Multi-tenant load tests
  - **Depends on**: Unit Tests, Shared Testing Utilities

- [ ] **Performance Tests** (`infrastructure/tests/performance/`)
  - Provisioning time validation (< 2 minutes)
  - Scale-to-zero behavior tests
  - Load testing (100 concurrent tenant creations)
  - Cold start time validation (< 2 seconds)
  - API response time tests
  - **Depends on**: Integration Tests

- [ ] **Security Tests** (`infrastructure/tests/security/`)
  - Penetration testing
  - Isolation audit scripts
  - Security vulnerability scanning
  - Compliance validation
  - **Depends on**: Integration Tests

### Documentation

- [ ] **Technical Documentation** (`docs/`)
  - Architecture diagrams
  - API specifications
  - Database schemas
  - Deployment guides
  - **Depends on**: All Phase 1 components

- [ ] **User Documentation** (`docs/`)
  - Merchant onboarding guide
  - Admin dashboard guide
  - Custom domain setup guide
  - Troubleshooting documentation
  - **Depends on**: All Phase 1 components

---

## Dependencies & Sequencing

### Critical Path (MVP) - Phase 1

**Foundation Layer:**

1. Monorepo Setup → `packages/` (config, types, utils, test-utils) → All apps

**Control Plane Layer:**

2. `apps/control-plane/` API Foundation → Database Tooling → Development Tooling → Testing Infrastructure
3. Control Plane API → Neon Database Automation → Cloud Run Deployment → Rollback Mechanism
   - **Parallel**: Database Tooling, Development Tooling, Testing Infrastructure

**Tenant Instance Layer:**

4. `apps/tenant-instance/` MedusaJS Template → Database Tooling → Development Tooling → Testing Infrastructure
5. Tenant Instance Setup → Authentication → Admin Dashboard
   - **Parallel with**: Control Plane (can develop simultaneously after packages)

**Storefront Layer:**

6. `apps/storefront/` Next.js Setup → Tenant Routing → Basic Storefront Features
   - **Depends on**: Control Plane API (for tenant lookup), Tenant Instance API (for data)

**Infrastructure Layer:**

7. `infrastructure/` Monitoring → Health Checks → CI/CD Pipeline
   - **Depends on**: All components above

### Production Dependencies - Phase 2

**Sequential Dependencies:**

- Custom Domain Support (`apps/control-plane/`) → Custom Domain Routing (`apps/storefront/`)
- SSL Automation (`apps/control-plane/`) → Custom Domain Routing (`apps/storefront/`)
- Comprehensive Monitoring (`apps/control-plane/`) → Basic Monitoring (Phase 1)

**Parallel Tasks:**

- Scale-to-Zero Optimization (`apps/tenant-instance/`) || Performance Optimization (`apps/tenant-instance/`)
- Security Hardening (`apps/tenant-instance/`) || Performance Optimization (`apps/storefront/`)

### Enhanced Features Dependencies - Phase 3

- Full-Text Search (`apps/tenant-instance/`) → Performance Optimization (Phase 2)
- Multi-Region Support (`infrastructure/`) → Comprehensive Monitoring (Phase 2)
- A/B Testing (`apps/storefront/`) → Performance Optimization (`apps/storefront/`, Phase 2)

---

## Success Metrics by Phase

### Phase 1 (MVP)

- Provisioning time: < 2 minutes
- Success rate: > 95%
- Database isolation: 100%
- 10 test tenants provisioned successfully

### Phase 2 (Production)

- Provisioning time: < 3 minutes (acceptable)
- Success rate: > 99%
- Platform supports 100+ tenants
- Uptime: 99.9%

### Phase 3 (Enhanced)

- Platform scales to 1,000+ tenants
- API response time: p95 < 200ms
- Cold start: < 2 seconds
- Cost per tenant: < $5/month (idle)

### Phase 4 (Enterprise)

- Enterprise features operational
- White-label support functional
- Mobile apps launched
- ML features integrated

---

## Notes

- All tasks maintain strict tenant isolation (non-negotiable)
- Serverless-first approach for all infrastructure
- TypeScript required for all backend code
- **PNPM** is the package manager (use `pnpm` instead of `npm`/`yarn`)
- Regular security audits throughout all phases
- Performance targets must be met before moving to next phase
