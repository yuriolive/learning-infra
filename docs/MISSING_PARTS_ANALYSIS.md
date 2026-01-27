# Missing Parts Analysis: Beyond the Control Plane

> [!IMPORTANT]
> This document identifies critical gaps outside the Control Plane that must be addressed to achieve Phase 1 MVP objectives outlined in the [PRD](file:///c:/Users/yuri_/IdeaProjects/learning-infra/PRD.md) and [ROADMAP](file:///c:/Users/yuri_/IdeaProjects/learning-infra/ROADMAP.md).

## Executive Summary

The Control Plane has progressed significantly with robust provisioning and security infrastructure. However, **several foundational components required for the multi-tenant architecture remain incomplete or missing**. This analysis prioritizes gaps by their impact on achieving the Phase 1 MVP goal: **provisioning a fully functional tenant in under 2 minutes with complete isolation**.

---

## 1. Multi-Tenant Storefront (`apps/storefront/`)

### Current State

The storefront exists as a basic Next.js landing page without multi-tenant capabilities.

### Missing Components

#### 1.1 Hostname-Based Tenant Resolution

**Status**: ❌ Not Implemented

**Description**: No middleware exists to extract the tenant identifier from incoming requests.

**Required Implementation**:

- Middleware at [`apps/storefront/src/middleware.ts`](file:///c:/Users/yuri_/IdeaProjects/learning-infra/apps/storefront/src/middleware.ts) to:
  - Parse hostname/subdomain (e.g., `acme.vendin.store` → `tenantId: acme`)
  - Support custom domains via Cloudflare for SaaS lookup
  - Gracefully handle unknown domains with fallback error pages
- Integration with Control Plane API to resolve tenant metadata

**Impact**: **CRITICAL** - Without this, the entire multi-tenant routing system cannot function.

**Reference PRD**: Section 4.1 (Backend & Database), AC3 (Hostname Routing)

#### 1.2 Dynamic Tenant API Integration

**Status**: ❌ Not Implemented

**Description**: No services or hooks to communicate with tenant-specific Medusa backends.

**Required Implementation**:

- API client factory that dynamically targets the correct tenant instance URL
- React hooks/context for tenant-aware data fetching
- Request authentication/authorization forwarding
- Error handling for tenant-specific API failures

**Impact**: **CRITICAL** - Customers cannot browse products or complete purchases.

**Reference PRD**: User Story US5 (End Customer Shopping)

#### 1.3 Cloudflare for SaaS Integration

**Status**: ❌ Not Implemented (Phase 2 feature)

**Description**: Application-side logic for custom domain mapping is absent.

**Required Implementation** (Phase 2):

- Cloudflare Worker integration for custom domain resolution
- DNS verification status checking
- SSL certificate status monitoring
- Fallback routing for domains pending verification

**Impact**: **HIGH** (Phase 2) - Custom domains are a P1 feature but not MVP-blocking.

**Reference PRD**: User Story US3 (Custom Domains)

---

## 2. Tenant Instance Template (`apps/tenant-instance/`)

### Current State

A vanilla MedusaJS 2.0 boilerplate without production-ready configurations.

### Missing Components

#### 2.1 Storage Provider Configuration (Cloudflare R2)

**Status**: ❌ Not Implemented

**Description**: No integration with Cloudflare R2 for product images and media assets.

**Required Implementation**:

- Medusa storage module for R2 (or custom adapter)
- Per-tenant bucket namespacing strategy
- CDN integration for asset delivery
- Upload/delete lifecycle management

**Impact**: **HIGH** - Merchants cannot upload product images, severely limiting usability.

**Reference PRD**: Section 4.2 (Infrastructure & Networking - Storage)

#### 2.2 Search Provider Setup (Meilisearch)

**Status**: ❌ Not Implemented (Phase 3 feature)

**Description**: Full-text search capability is missing.

**Required Implementation** (Phase 3):

- Meilisearch integration module
- Index management per tenant
- Search synchronization hooks
- Search API endpoints

**Impact**: **MEDIUM** (Phase 3) - Acceptable for MVP, critical for production.

**Reference PRD**: Phase 3 features, Section 4.2

#### 2.3 Tenant Initialization Scripts

**Status**: ⚠️ Partial Implementation

**Description**: No standardized way to seed a new tenant with default data upon provisioning.

**Required Implementation**:

- Seed scripts for:
  - Default admin roles and permissions
  - Initial product categories/collections (optional)
  - Sample configuration settings
  - Welcome email templates
- Automated execution during provisioning flow

**Impact**: **MEDIUM** - Degrades merchant onboarding experience without defaults.

**Reference PRD**: User Story US1 (Merchant Signup), AC1 (Provisioning Performance)

#### 2.4 Container Optimization

**Status**: ⚠️ Needs Optimization (Phase 2)

**Description**: Current container likely exceeds target size for optimal cold starts.

**Required Implementation** (Phase 2):

- Multi-stage Docker build optimization
- Tree-shaking and dependency pruning
- Pre-built image caching strategy
- Target: Container size < 200MB

**Impact**: **MEDIUM** (Phase 2) - Cold start performance critical for scale-to-zero.

**Reference PRD**: Section 4.2 (Compute), US4 (Scaling & Cost Optimization)

---

## 3. Shared Packages (`packages/`)

### Current State

Foundational packages are partially complete but lack critical shared types and utilities.

### Missing Components

#### 3.1 `packages/types/`

**Status**: ❌ Not Implemented

**Description**: No centralized type definitions for cross-component communication.

**Required Implementation**:

- `Tenant` metadata interface (matches Control Plane schema)
- `TenantConfig` interface for provisioning data
- API contract types for Control Plane endpoints
- Storefront-to-backend API types
- Shared error types

**Impact**: **CRITICAL** - Type safety and consistency across monorepo is compromised.

**Reference ROADMAP**: Phase 1, `packages/types/` section

**Example Structure**:

```typescript
// packages/types/src/tenant.ts
export interface Tenant {
  id: string;
  merchantEmail: string;
  storeName: string;
  subdomain: string;
  customDomains: string[];
  apiUrl: string;
  status: "provisioning" | "active" | "suspended" | "deleted";
  // ... matches Control Plane schema
}
```

#### 3.2 `packages/utils/`

**Status**: ⚠️ Minimal Implementation (logger only)

**Description**: Missing essential shared utilities.

**Required Implementation**:

- **Tenant resolution utilities**: Hostname parsing, subdomain extraction
- **Domain validation**: FQDN validation, DNS record formatting
- **Error handling**: Standardized error classes, error serialization
- **Retry logic**: Exponential backoff utilities
- **Date/time helpers**: Timezone handling, formatting

**Impact**: **HIGH** - Code duplication and inconsistent logic across apps.

**Reference ROADMAP**: Phase 1, `packages/utils/` section

#### 3.3 `packages/test-utils/`

**Status**: ❌ Not Implemented

**Description**: No shared testing infrastructure for multi-tenant isolation testing.

**Required Implementation**:

- Test database factory (isolated DBs per test)
- Mock tenant data generators
- Test API client helpers
- Multi-tenant test harness

**Impact**: **MEDIUM** - Slows integration testing and isolation verification.

**Reference ROADMAP**: Phase 1, `packages/test-utils/` section

---

## 4. Infrastructure & DevOps

### Current State

Infrastructure is distributed across app-specific directories without centralized orchestration.

### Missing Components

#### 4.1 Root `infrastructure/` Directory

**Status**: ❌ Not Implemented

**Description**: No centralized Infrastructure as Code (IaC) repository.

**Required Implementation**:

- Root `infrastructure/` directory structure:
  - `infrastructure/terraform/` or `infrastructure/pulumi/` (choose one)
  - `infrastructure/monitoring/` (centralized observability)
  - `infrastructure/ci/` (shared CI/CD templates)
  - `infrastructure/tests/` (performance and security tests)
- Terraform/Pulumi modules for:
  - Shared GCP resources (VPC, Secret Manager, Artifact Registry)
  - Neon project/organization-level config
  - Cloudflare zone configuration
  - Monitoring stack (if using self-hosted Prometheus/Grafana)

**Impact**: **MEDIUM** - Manual infrastructure management increases provisioning errors.

**Reference ROADMAP**: Phase 1, `infrastructure/` section

#### 4.2 Multi-Tenant Lifecycle Testing

**Status**: ❌ Not Implemented

**Description**: No automated tests for the full provisioning-to-deletion lifecycle.

**Required Implementation**:

- Integration test suite that:
  - Provisions a test tenant end-to-end
  - Verifies database isolation
  - Tests routing to the provisioned instance
  - Confirms cleanup on deletion
- Performance benchmarking (target < 2 minutes)

**Impact**: **HIGH** - Cannot validate MVP success criteria (AC1, AC2).

**Reference PRD**: AC1 (Provisioning Performance), AC2 (Database Isolation)

#### 4.3 Unified CI/CD Pipeline

**Status**: ⚠️ Partial Implementation

**Description**: GitHub Actions exist but lack orchestration for multi-component deployments.

**Required Implementation**:

- Unified workflow for monorepo builds (using Turborepo/Bun)
- Automated deployment triggers:
  - Control Plane → Cloudflare Workers
  - Storefront → Cloudflare Pages
  - Tenant template → GCP Artifact Registry (Docker image)
- Pre-deployment smoke tests
- Rollback automation on deployment failures

**Impact**: **MEDIUM** - Manual deployments increase risk of inconsistencies.

**Reference ROADMAP**: Phase 1, `infrastructure/ci/` section

---

## 5. Gap Prioritization Matrix

| Component                                | MVP Blocker?     | Phase | Complexity | Estimated Effort |
| ---------------------------------------- | ---------------- | ----- | ---------- | ---------------- |
| **Storefront Tenant Resolution**         | ✅ Yes           | P0    | Medium     | 3-5 days         |
| **Storefront API Integration**           | ✅ Yes           | P0    | Medium     | 3-5 days         |
| **`packages/types/`**                    | ✅ Yes           | P0    | Low        | 1-2 days         |
| **`packages/utils/` Enhancements**       | ⚠️ Partial       | P0    | Medium     | 2-3 days         |
| **Tenant R2 Storage Integration**        | ⚠️ High Impact   | P1    | Medium     | 3-4 days         |
| **Tenant Initialization Seeds**          | ⚠️ Medium Impact | P0/P1 | Low        | 1-2 days         |
| **Multi-Tenant Lifecycle Tests**         | ✅ Yes           | P0    | High       | 5-7 days         |
| **Root `infrastructure/` Setup**         | ❌ No            | P1    | Medium     | 3-5 days         |
| **Container Optimization**               | ❌ No            | P2    | Medium     | 3-5 days         |
| **Cloudflare for SaaS (Custom Domains)** | ❌ No            | P1    | High       | 7-10 days        |

**Legend**:

- ✅ **MVP Blocker**: Must complete before Phase 1 validation
- ⚠️ **High/Medium Impact**: Degrades UX but doesn't block core functionality
- ❌ **Phase 2/3**: Documented for future phases

---

## 6. Recommended Implementation Sequence

### Phase 1a: Foundation (Weeks 1-2)

> [!NOTE]
> Establish the shared contracts and utilities before implementing multi-tenant logic.

1. **Create `packages/types/`** (Day 1-2)
   - Define `Tenant`, `TenantConfig`, API contract types
   - Export from monorepo root

2. **Enhance `packages/utils/`** (Day 3-4)
   - Tenant resolution helpers (`extractTenantFromHostname()`)
   - Domain validation utilities
   - Shared error classes

3. **Setup `packages/test-utils/`** (Day 5-6)
   - Test database factory
   - Mock tenant generators

### Phase 1b: Storefront Multi-Tenancy (Weeks 3-4)

> [!IMPORTANT]
> This unlocks end-to-end customer flows.

4. **Implement Storefront Middleware** (Day 7-10)
   - Hostname parsing and tenant resolution
   - Integration with Control Plane `/api/tenants/:tenantId` endpoint
   - Error handling for unknown domains

5. **Build Tenant API Client** (Day 11-14)
   - Dynamic API client factory
   - React hooks for tenant-aware data fetching
   - Implement product listing and cart flows

### Phase 1c: Tenant Instance Hardening (Weeks 4-5)

6. **Configure R2 Storage Module** (Day 15-18)
   - Medusa storage adapter for R2
   - Per-tenant bucket namespacing
   - CDN integration

7. **Create Tenant Seed Scripts** (Day 19-20)
   - Default roles/permissions
   - Automated execution in provisioning flow

### Phase 1d: Validation & Testing (Week 6)

8. **Multi-Tenant Lifecycle Tests** (Day 21-25)
   - End-to-end provisioning tests
   - Isolation verification scripts
   - Performance benchmarking (< 2 min target)

9. **MVP Validation** (Day 26-30)
   - Provision 10 test tenants
   - Verify all acceptance criteria
   - Document findings and blockers

---

## 7. UI/UX Inspiration for Storefront

> [!TIP]
> The following resources inspire a premium, dynamic storefront design that wows users on first visit.

### Design Principles

Based on the [web application development guidelines](#), the storefront should prioritize:

- **Rich Aesthetics**: Vibrant colors, glassmorphism, dynamic gradients
- **Modern Typography**: Google Fonts (Inter, Outfit, Roboto) over defaults
- **Micro-Animations**: Hover effects, smooth transitions, kinetic typography
- **Premium Feel**: State-of-the-art design, not a basic MVP

### Reference Sites

#### Typography & Motion

- [Stretch Pro - Futuristic Typeface](https://www.behance.net/gallery/100939153/Stretch-Pro-Futuristic-Typeface?tracking_source=search_projects%7Cstretch+font)
- [Smear Sans - Stretched Typeface](https://www.behance.net/gallery/120758031/Smear-Sans-Stretched-Typeface?tracking_source=search_projects%7Cstretch+font)
- [Behance - Stretch Font Search](https://www.behance.net/search/projects/stretch%20font)
- Kinetic Typography (motion-based text effects)

#### Interactive Experiences

- [Glossy Creative WebGL Slider](https://www.sliderrevolution.com/templates/glossy-creative-webgl-slider-template/)
- [Linktree](https://linktr.ee/) - Clean, modular UI
- [Spline Design](https://spline.design/) - 3D interactive elements
- [Play Creative Tool](https://createwithplay.com/) - Engaging animations

#### SaaS Design Patterns

- [Fin AI](https://fin.ai/) - Modern AI interface
- [Intercom Suite](https://www.intercom.com/suite) - Clean enterprise design
- [Petal Card](https://www.petalcard.com/) - Financial product elegance
- [Typeform](https://www.typeform.com/) - Conversational UI
- [Worksome](https://www.worksome.com/) - Professional B2B design
- [Ghost Publishing](https://ghost.org/) - Content-focused minimalism

### Implementation Recommendations

**Design System**:

- Create `apps/storefront/src/styles/design-tokens.css` with:
  - HSL-based color palette (avoid plain red/blue/green)
  - Fluid typography scale
  - Shadow and glassmorphism utilities
  - Animation timing functions

**Component Strategy**:

- Build reusable components in `apps/storefront/src/components/`
- Use CSS modules or styled-components (avoid inline styles)
- Implement dark mode from day one
- Add smooth loading states and skeleton screens

**Performance**:

- Target < 1s first contentful paint (FCP)
- Optimize images with Next.js Image component
- Lazy load below-the-fold content
- Implement edge caching via Cloudflare Pages

---

## 8. Success Criteria Alignment

### MVP Validation Checklist

Using the [PRD acceptance criteria](file:///c:/Users/yuri_/IdeaProjects/learning-infra/PRD.md) as benchmarks:

- [ ] **AC1: Provisioning Performance**
  - ✅ Control Plane can create DB + deploy instance
  - ❌ End-to-end flow (including storefront access) untested
  - **Blocker**: Multi-tenant lifecycle tests missing

- [ ] **AC2: Database Isolation**
  - ✅ Control Plane provisions isolated Neon databases
  - ⚠️ Automated audit scripts incomplete
  - **Blocker**: `packages/test-utils/` isolation test harness

- [ ] **AC3: Hostname Routing**
  - ❌ Storefront cannot resolve tenants by hostname
  - **Blocker**: Middleware + API integration missing

- [ ] **AC4: Scale-to-Zero**
  - ✅ Cloud Run instances configured with `min-instances: 0`
  - ⚠️ Cold start performance unmeasured
  - **Future Work**: Container optimization (Phase 2)

- [ ] **AC5: Security**
  - ✅ Physical database isolation
  - ✅ TLS 1.3 enforced, secrets managed
  - ⚠️ Penetration testing not conducted
  - **Future Work**: Security audit (Phase 2)

- [ ] **AC6: Monitoring**
  - ⚠️ Basic logging exists
  - ❌ Centralized metrics dashboard incomplete
  - **Future Work**: Comprehensive monitoring (Phase 2)

---

## 9. Risk Mitigation

### Identified Risks

| Risk                                     | Likelihood | Impact | Mitigation                                                          |
| ---------------------------------------- | ---------- | ------ | ------------------------------------------------------------------- |
| **Storefront routing breaks under load** | Medium     | High   | Implement comprehensive integration tests with load simulation      |
| **R2 upload delays break UX**            | Low        | Medium | Add optimistic UI updates and background upload queues              |
| **Type mismatches between apps**         | High       | Medium | Enforce strict TypeScript checks + shared `packages/types/`         |
| **Cold starts exceed 2s target**         | Medium     | Medium | Defer container optimization to Phase 2, measure in Phase 1         |
| **Complex Cloudflare for SaaS setup**    | Low        | High   | Use subdomain-only routing for MVP, defer custom domains to Phase 2 |

---

## 10. Next Actions

### Immediate Priorities (This Sprint)

1. **Create `packages/types/`** with `Tenant` interface
2. **Implement storefront middleware** for tenant resolution
3. **Build tenant API client** in storefront
4. **Write multi-tenant lifecycle integration tests**

### Short-Term Priorities (Next 2 Sprints)

5. **Configure R2 storage** in tenant template
6. **Create tenant seed scripts** with default data
7. **Setup root `infrastructure/`** directory
8. **Document deployment runbooks**

### Phase 2 Preparation

9. **Design Cloudflare for SaaS integration** (custom domains)
10. **Plan container optimization** strategy
11. **Establish comprehensive monitoring** stack

---

## Appendix: Related Documents

- [PRD](file:///c:/Users/yuri_/IdeaProjects/learning-infra/PRD.md) - Product Requirements Document
- [ROADMAP](file:///c:/Users/yuri_/IdeaProjects/learning-infra/ROADMAP.md) - Phase-by-phase task breakdown
- [AGENTS.md](file:///c:/Users/yuri_/IdeaProjects/learning-infra/AGENTS.md) - Agent guidelines and architecture principles
- [Control Plane Deployment Guide](file:///c:/Users/yuri_/IdeaProjects/learning-infra/docs/deployment/CONTROL_PLANE.md)

---

**Last Updated**: 2026-01-24
**Status**: Living Document - Update as implementation progresses
