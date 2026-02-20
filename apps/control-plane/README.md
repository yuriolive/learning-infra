# Control Plane API

Orchestrator API for managing tenant provisioning in the multi-tenant e-commerce platform.

## Overview

The Control Plane API provides RESTful endpoints for tenant management, including creation, retrieval, update, and deletion of tenants.

## API Endpoints

### Health Check

- `GET /health` - Health check endpoint
- `GET /` - Health check endpoint (alias)

### Tenants

- `POST /api/tenants` - Create a new tenant
- `GET /api/tenants` - List all tenants
- `GET /api/tenants/:tenantId` - Get tenant details
- `DELETE /api/tenants/:tenantId` - Soft delete a tenant (with cleanup)
- `PATCH /api/tenants/:tenantId` - Update tenant details
- `PUT /api/tenants/:tenantId` - Update tenant details (alias)

## Request/Response Examples

### Create Tenant

```bash
POST /api/tenants
Content-Type: application/json

{
  "name": "My Store",
  "subdomain": "mystore",
  "metadata": {
    "customField": "value"
  }
}
```

### Get Tenant

```bash
GET /api/tenants/{tenantId}
```

### Update Tenant

```bash
PATCH /api/tenants/{tenantId}
Content-Type: application/json

{
  "name": "Updated Store Name",
  "status": "suspended"
}
```

### Delete Tenant

```bash
DELETE /api/tenants/{tenantId}
```

## Development

### Prerequisites

- Node.js runtime installed
- PostgreSQL database (or Neon connection string)

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string.
  - For local: `postgres://postgres:postgres@localhost:5432/control_plane`
  - For production: Use a Neon connection string (uses HTTP driver automatically).
- `ADMIN_API_KEY` - Secret token required for all `/api/tenants/*` endpoints.
  - Clients must provide `Authorization: Bearer <ADMIN_API_KEY>`.
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins in production.
  - In development, any origin is allowed by default.

### Local Development

For a comprehensive guide, see [docs/local-development.md](../../docs/local-development.md).

#### Quick Start

1. Start infrastructure: `pnpm dev:infra` (at the root)
2. Ensure `DATABASE_URL` is set in `apps/control-plane/.env`.
3. Set up the database: `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed` (at the root)

### Running the Server

```bash
pnpm run dev
```

The server will start on `http://localhost:8787` (Cloudflare Workers dev server).

### Database Operations

```bash
# Generate migration files
pnpm run db:generate

# Apply migrations to database
pnpm run db:migrate

# Push schema changes directly (for development)
pnpm run db:push

# Open Drizzle Studio
pnpm run db:studio
```

### Building

```bash
pnpm run build
```

### Type Checking

```bash
pnpm run typecheck
```

### Testing

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

## Architecture

The codebase follows a domain-driven design structure:

- **`src/domains/`** - Domain-specific modules organized by feature
  - **`tenants/`** - Tenant management domain
    - `tenant.types.ts` - TypeScript type definitions
    - `tenant.schemas.ts` - Request validation schemas (Zod)
    - `tenant.repository.ts` - Data storage layer using Drizzle ORM
    - `tenant.service.ts` - Business logic layer
    - `tenant.routes.ts` - API route handlers
- **`src/database/`** - Database configuration and schema
  - `db.ts` - Drizzle client initialization
  - `schema.ts` - Drizzle schema definitions
- **`src/index.ts`** - Application entry point and server setup

## Testing

The project includes comprehensive unit tests with Vitest:

- **Repository Tests** (`tests/unit/storage/`) - Tests for data storage layer
- **Service Tests** (`tests/unit/api/`) - Tests for business logic layer
- **Route Tests** (`tests/unit/api/`) - Tests for API endpoints

Current test coverage: **96%**

### Running Tests

```bash
# Run all tests
pnpm run test

# Watch mode for development
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

## Notes

- Uses PostgreSQL for tenant metadata via Drizzle ORM
- Physical database isolation is handled per tenant as part of provisioning
- All endpoints under `/api/tenants/*` now require Bearer authentication.
- CORS headers are dynamically controlled via `NODE_ENV` and `ALLOWED_ORIGINS`.
- Comprehensive unit test suite (note: tests currently require DATABASE_URL or mocking)
