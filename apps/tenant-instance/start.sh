#!/bin/sh

# Export environment variable to bypass the package manager check (since root is bun)
export PNPM_SKIP_PACKAGE_MANAGER_CHECK=true

# Wait for database to be ready (handled by docker-compose depends_on healthcheck)

echo "Running database migrations..."
pnpm run db:migrate

echo "Seeding database..."
pnpm run db:seed || echo "Seeding failed, continuing..."

echo "Starting Medusa development server..."
pnpm run dev
