# Stage 1: Base
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate && npm install -g turbo@2.6.1
WORKDIR /app

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

# Install build tools for native modules EARLIER to ensure pnpm install can use them if needed
RUN apk add --no-cache python3 make g++ gcc

# Enable pnpm store caching
ENV PNPM_STORE_DIR=/pnpm/store

# Copy lockfile and package.json's of isolated subworkspace
COPY out/json/ .
COPY out/pnpm-lock.yaml ./

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source code of isolated subworkspace
COPY out/full/ .

# Remove local .env to prevent overrides during build
RUN rm -f apps/tenant-instance/.env

# Essential dummies for config/modules to load without null (real values injected at runtime)
ENV NODE_ENV=production \
    DATABASE_URL=postgres://dummy:dummy@dummy:5432/dummy_db?sslmode=require \
    REDIS_URL=redis://dummy:6379 \
    REDIS_PREFIX=medusa: \
    JWT_SECRET=build-dummy-secret-abc123 \
    COOKIE_SECRET=build-dummy-secret-abc123 \
    GEMINI_API_KEY=build-dummy-key-abc123 \
    STORE_CORS=http://localhost:8000 \
    ADMIN_CORS=http://localhost:7001 \
    AUTH_CORS=http://localhost:9000

# Build the project (explicitly pass NODE_ENV)
RUN NODE_ENV=production pnpm build --filter=@vendin/tenant-instance...

# Deploy the app to a clean directory with production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @vendin/tenant-instance --prod deploy /app/deploy

# Consolidate artifact relocation and strict verification into a single layer
# Consolidate artifact relocation and strict verification into a single layer
# Debug: list dist to understand what was built (Admin Dashboard should be here or in .medusa)
RUN echo "=== DEBUG: Listing build artifacts ===" && \
    ls -la /app/apps/tenant-instance/ && \
    ls -la /app/apps/tenant-instance/dist/ || echo "dist missing" && \
    ls -la /app/apps/tenant-instance/.medusa/ || echo ".medusa missing" && \
    # Move artifacts
    cp -a /app/apps/tenant-instance/dist/. /app/deploy/ && \
    # Create the structure Medusa expects in production
    mkdir -p /app/deploy/.medusa/server && \
    cp -a /app/apps/tenant-instance/dist/. /app/deploy/.medusa/server/ && \
    # Strict Check: .medusa MUST exist (contains client, types, etc.)
    if [ -d "/app/apps/tenant-instance/.medusa" ]; then \
    cp -a /app/apps/tenant-instance/.medusa /app/deploy/; \
    else \
    echo "FATAL ERROR: .medusa directory not found. Medusa build failed to generate it." && exit 1; \
    fi && \
    # Strict verification: Ensure the admin dashboard index.html exists in the final location
    if [ ! -f "/app/deploy/.medusa/server/public/admin/index.html" ]; then \
    echo "FATAL ERROR: Admin dashboard index.html missing in /app/deploy/.medusa/server/public/admin/"; \
    ls -R /app/deploy; \
    exit 1; \
    fi


# Stage 4: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Copy the deployed application (includes production node_modules from pnpm deploy)
COPY --from=builder /app/deploy .

# Set production environment
ENV NODE_ENV=production

# Expose ports
EXPOSE 9000 5173

# Ensure start.sh is executable
RUN chmod +x ./start.sh

# Start
ENTRYPOINT ["./start.sh"]
