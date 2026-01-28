# Tenant Instance (Medusa Store)

This application is the MedusaJS backend for the tenant instance.

## Prerequisites

- [Docker](https://www.docker.com/)
- [pnpm](https://pnpm.io/)
- [Medusa CLI](https://docs.medusajs.com/development/backend/install) (optional: `npm install -g @medusajs/medusa-cli`)

### 1. Start the Application

Everything is configured to run via Docker. From the **root** directory:

```bash
docker compose up tenant-instance
```

This will automatically:

- Start PostgreSQL and Redis.
- Install dependencies via `pnpm`.
- Run database migrations.
- Attempt to seed the database.
- Start the Medusa development server.

### 2. Verify if it's running

Once the logs show `Medusa server started`, you can access:

- **Backend API**: `http://localhost:9000/health`
- **Admin Dashboard**: `http://localhost:9000/app` (or `http://localhost:5173`)

### 3. Create Admin User

If you need to create an admin user manually:

```bash
docker compose exec tenant-instance npx medusa user -e admin@vendin.store -p supersecret
```

## Testing

We use [Vitest](https://vitest.dev/) for testing.

### Run tests inside Docker (Recommended)

To ensure the test environment matches the runtime:

```bash
docker compose exec tenant-instance pnpm run test
```

### Run tests locally

```bash
pnpm run test
```

## Docker Compose

The root `docker-compose.yml` includes:

- **Postgres**: Running on port 5432 (default DB `main`)
- **Redis**: Running on port 6379
- **Neon Proxy**: For simulating Neon serverless environment locally.

If you need to access the database directly, use:
`postgres://postgres:postgres@localhost:5432/main` (The `.env` is also configured to use this by default for local development).
