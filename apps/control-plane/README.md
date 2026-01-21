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

- Bun runtime installed
- PostgreSQL database (or Neon connection string)

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string.
  - For local: `postgres://postgres:postgres@localhost:5432/control_plane`
  - For production: Use a Neon connection string (uses HTTP driver automatically).

### Local Database

The project uses Docker Compose to run a local PostgreSQL instance.

1. Run `docker-compose up -d` at the root.
2. Ensure `DATABASE_URL` is set in `.env`.
3. Push schema: `bun run db:push`.

### Running the Server

```bash
bun dev
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

### Database Operations

```bash
# Generate migration files
bun run db:generate

# Apply migrations to database
bun run db:migrate

# Push schema changes directly (for development)
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

### Building

```bash
bun run build
```

### Type Checking

```bash
bun run typecheck
```

### Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
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
bun run test

# Watch mode for development
bun run test:watch

# Generate coverage report
bun run test:coverage
```

## Notes

- Uses PostgreSQL for tenant metadata via Drizzle ORM
- Physical database isolation is handled per tenant as part of provisioning
- All endpoints include CORS headers for development
- Request validation is handled via Zod schemas
- Error handling returns appropriate HTTP status codes
- Comprehensive unit test suite (note: tests currently require DATABASE_URL or mocking)
