# Tenant Instance (Medusa Store)

This application is the MedusaJS backend for the tenant instance.

## Prerequisites

- [Docker](https://www.docker.com/)
- [pnpm](https://pnpm.io/)
- [Medusa CLI](https://docs.medusajs.com/development/backend/install) (optional: `npm install -g @medusajs/medusa-cli`)

### Local Development

For a comprehensive guide, see [docs/local-development.md](../../docs/local-development.md).

#### Quick Start

Everything should be run from the repository root:

1. **Start infrastructure**: `pnpm dev:infra`
2. **Setup Databases**: `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed`
3. **Start the application**: `pnpm dev`

### 2. Verify if it's running

Once the logs show `Medusa server started`, you can access:

- **Backend API**: `http://localhost:9000/health`
- **Admin Dashboard**: `http://localhost:9000/app` (or `http://localhost:5173`)

### 3. Create Admin User

If you need to create an admin user manually:

```bash
pnpm --filter @vendin/tenant-instance medusa user -e admin@vendin.store -p supersecret
```

## Testing

We use [Vitest](https://vitest.dev/) for testing.

```bash
pnpm run test
```

## Infrastructure

The root `docker-compose.yml` includes:

- **Postgres**: Running on port 5432 (default DB `main`)
- **Redis**: Running on port 6379
- **Neon Proxy**: For simulating Neon serverless environment locally.

If you need to access the database directly, use:
`postgres://postgres:postgres@localhost:5432/main` (The `.env` is also configured to use this by default for local development).
