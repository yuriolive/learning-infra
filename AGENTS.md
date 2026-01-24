# AGENTS.md - Multi-Tenant E-commerce Platform

## Overview

This document describes the agent architecture and guidelines for AI assistants working on this multi-tenant e-commerce platform project.

## Project Architecture

### Core Components

1. **Control Plane (Orchestrator)**
   - Central API managing tenant provisioning
   - Handles merchant signup and store creation
   - Manages database and compute resource allocation
   - Location: `/control-plane/`

2. **Tenant Instances (Individual Stores)**
   - Isolated MedusaJS 2.0 backend instances
   - Each tenant has dedicated database and compute
   - Location: `/tenant-instance/` (template) or `/tenants/{tenant-id}/`

3. **Storefront**
   - Multi-tenant Next.js application
   - Routes requests to correct tenant based on hostname/subdomain
   - Location: `/storefront/`

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
  - Implement tenant-specific customizations

### Storefront Agent
- **Purpose**: Build and maintain the multi-tenant Next.js storefront
- **Key Tasks**:
  - Implement hostname-based tenant routing
  - Configure Cloudflare SaaS for custom domains
  - Handle SSL certificate management
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

### Future Additions
- **Search**: Meilisearch (Milestone 5)

## Development Guidelines

### Code Organization
```
/
├── control-plane/          # Orchestrator API
├── tenant-instance/        # MedusaJS template/boilerplate
├── storefront/             # Next.js multi-tenant app
├── infrastructure/         # IaC (Terraform/Pulumi)
└── shared/                 # Shared utilities/types
```

### Database Strategy
- Each tenant gets a dedicated Neon database
- Use Neon API for programmatic database creation
- Store connection strings securely (environment variables or secrets manager)
- Never share database connections between tenants

### API Design
- Control Plane API: RESTful endpoints for tenant management
- Tenant API: Standard MedusaJS REST/GraphQL endpoints
- Storefront API: Next.js API routes for tenant resolution

### Environment Variables
- Control Plane: `NEON_API_KEY`, `GCP_PROJECT_ID`, `CLOUDFLARE_API_TOKEN`
- Tenant Instances: `DATABASE_URL`, `REDIS_URL`, `TENANT_ID`
- Storefront: `CONTROL_PLANE_API_URL`, `CLOUDFLARE_ACCOUNT_ID`

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
