#!/bin/sh

if [ "$NODE_ENV" = "production" ]; then
  # Note: Database migrations are handled by the Control Plane via Cloud Run Jobs
  echo "Starting Medusa production server..."
  # Use the binary directly to avoid dependency on pnpm in the runner image
  exec ./node_modules/.bin/medusa start
else
  # Ensure dependencies are installed (especially important if using volumes in development)
  # Check if we are in the monorepo structure (development)
  if [ -d "/server/apps/tenant-instance" ]; then
    if [ ! -d "/server/node_modules/@medusajs" ] || [ ! -d "/server/apps/tenant-instance/node_modules" ]; then
      echo "Dependencies missing or incomplete, installing..."
      cd /server && pnpm install
      cd /server/apps/tenant-instance
    fi
  fi

  echo "Running database migrations..."
  pnpm run db:migrate

  echo "Seeding database..."
  pnpm run db:seed || echo "Seeding failed, continuing..."

  echo "Starting Medusa development server..."
  pnpm run dev
fi
