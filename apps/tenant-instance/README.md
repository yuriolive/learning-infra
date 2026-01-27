# Tenant Instance (Medusa Store)

This application is the MedusaJS backend for the tenant instance.

## Prerequisites

- [Docker](https://www.docker.com/)
- [Bun](https://bun.sh/)
- [Medusa CLI](https://docs.medusajs.com/development/backend/install) (optional, but recommended: `npm install -g @medusajs/medusa-cli`)

## Getting Started

### 1. Infrastructure

Start the required infrastructure (PostgreSQL and Redis) using Docker Compose from the root directory:

```bash
docker compose up -d
```

### 2. Environment Configuration

The `.env` file is already created for you in this directory with default local development values.
If not, copy the template:

```bash
cp .env .env.template
```

Ensure `DATABASE_URL` and `REDIS_URL` match your Docker configuration.

### 3. Install Dependencies

```bash
bun install
```

### 4. Database Migrations

Run the migrations to set up the database schema:

```bash
npx medusa db:migrate
# or if you have the CLI installed
medusa db:migrate
```

_Note: You might need to seed the database as well._

### 5. Create Admin User (Optional)

To create an admin user for the dashboard:

```bash
npx medusa user -e admin@vendin.store -p supersecret
```

### 6. Start the Application

Start the development server:

```bash
bun run dev
```

The server should be running at `http://localhost:9000`.

## Testing

We use [Vitest](https://vitest.dev/) for testing.

Run unit tests:

```bash
bun run test
```

Run tests with coverage:

```bash
bun run test:coverage
```

## Docker Compose

The root `docker-compose.yml` includes:

- **Postgres**: Running on port 5432 (default DB `main`)
- **Redis**: Running on port 6379
- **Neon Proxy**: For simulating Neon serverless environment locally.

If you need to access the database directly, use:
`postgres://postgres:postgres@localhost:5432/main`
