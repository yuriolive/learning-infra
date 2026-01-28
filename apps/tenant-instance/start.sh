#!/bin/sh

# Export environment variable to bypass the package manager check
# export PNPM_SKIP_PACKAGE_MANAGER_CHECK=true

# Wait for database to be ready (handled by docker-compose depends_on healthcheck)

echo "Running database migrations..."
pnpm run db:migrate

echo "Seeding database..."
pnpm run db:seed || echo "Seeding failed, continuing..."

if [ "$NODE_ENV" = "production" ]; then
  echo "Starting Medusa production server..."
  pnpm start
else
  echo "Starting Medusa development server..."
  pnpm run dev
fi
