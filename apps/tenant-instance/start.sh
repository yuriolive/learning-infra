#!/bin/sh

# Export environment variable to bypass the package manager check
# export PNPM_SKIP_PACKAGE_MANAGER_CHECK=true

# Ensure dependencies are installed (especially important if using volumes)
# We check for a key package to see if node_modules is populated
if [ ! -d "/server/node_modules/@medusajs" ] || [ ! -d "/server/apps/tenant-instance/node_modules" ]; then
  echo "Dependencies missing or incomplete, installing..."
  cd /server && pnpm install
  cd /server/apps/tenant-instance
fi

# Wait for database to be ready (handled by docker-compose depends_on healthcheck)

echo "Running database migrations..."
pnpm run db:migrate

if [ "$NODE_ENV" = "production" ]; then
  echo "Starting Medusa production server..."
  pnpm start
else
  echo "Seeding database..."
  pnpm run db:seed || echo "Seeding failed, continuing..."

  echo "Starting Medusa development server..."
  pnpm run dev
fi
