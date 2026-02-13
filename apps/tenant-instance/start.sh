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
  if command -v pnpm >/dev/null 2>&1; then
    pnpm run db:migrate
  else
    ./node_modules/.bin/medusa db:migrate
  fi

  echo "Seeding database..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm run db:seed || echo "Seeding failed, continuing..."
  else
    # Fallback to direct execution for production/slim images
    NODE_OPTIONS="--loader ts-node/esm" ./node_modules/.bin/medusa exec ./src/scripts/seed.ts || echo "Seeding failed, continuing..."
  fi

  echo "Starting Medusa development server..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm run dev
  else
    ./node_modules/.bin/medusa develop
  fi
fi
