---
description: Control Plane REST API patterns and endpoint design.
globs: apps/control-plane/**/*
---
# Control Plane API Development

## API Design
- **Style**: RESTful
- **Auth**: Fixed-token (Bearer) for MVP (using `ADMIN_API_KEY` env var)
- **Format**: JSON
- **Base URL**: `control.vendin.store`

## Endpoint Patterns

### Tenant Management
```
POST   /api/tenants              # Create tenant
GET    /api/tenants/:id          # Get tenant details
PATCH  /api/tenants/:id          # Update tenant
DELETE /api/tenants/:id          # Soft delete tenant
GET    /api/tenants              # List tenants
```

### Domain & Metrics
```
POST   /api/tenants/:id/domains  # Add custom domain
GET    /api/tenants/:id/domains  # List tenant domains
DELETE /api/tenants/:id/domains/:domainId # Remove domain
GET    /api/tenants/:id/metrics  # Get usage metrics
```

## API Documentation

### TSDoc Requirements
All route handlers must include TSDoc with:
- **Description**: Clear explanation
- **@param**: Document all parameters
- **@returns**: Document return type
- **@throws**: Document possible errors
- **@example**: Usage example

### OpenAPI & Scalar UI
- **Registration**: All schemas must be registered in `apps/control-plane/src/openapi/generator.ts`.
- **Validation**: ESLint rule `tsdoc/syntax` (warn level).
- **Interactive Docs**: Available at `/docs` (Scalar UI).
- **Spec**: OpenAPI 3.1.0 available at `/openapi.json`.

## Implementation Constraints
- Use `@asteasolutions/zod-to-openapi@^7.3.4` (Zod v3 compatibility).
- Use `OpenApiGeneratorV3` for spec generation.
- Error handling: Use structured responses and log with tenant context.

## References

- **Domain patterns**: See [@domain-structure.md](./domain-structure.md)
- **Logging**: See [@coding-standards.md](../../shared/quality/coding-standards.md)
