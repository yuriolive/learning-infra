# Stage 1: Base
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN npm install -g turbo@2.6.1
WORKDIR /app

# Stage 2: Pruner
FROM base AS pruner
COPY . .
RUN turbo prune --scope=@vendin/tenant-instance --docker

# Stage 3: Builder
FROM base AS builder
WORKDIR /app

# Enable pnpm store caching
ENV PNPM_STORE_DIR=/pnpm/store

# Copy lockfile and package.json's of isolated subworkspace
COPY --from=pruner /app/out/json/ /app/out/pnpm-lock.yaml ./

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source code of isolated subworkspace
COPY --from=pruner /app/out/full/ .

# Install build tools for native modules (needed by cpu-features, etc.)
RUN apk add --no-cache python3 make g++ gcc

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

# Temporary cache buster (remove after debugging)
RUN echo "Cache bust for debug: $(date)" > /tmp/bust.txt

# Build the project (explicitly pass NODE_ENV)
RUN NODE_ENV=production pnpm build --filter=@vendin/tenant-instance...

# Diagnostics to verify build artifacts (Recursive search)
RUN find /app/apps/tenant-instance/.medusa -name "index.html" || echo "[DEBUG] index.html not found in .medusa"
RUN ls -R /app/apps/tenant-instance/.medusa/server/public/admin || echo "[DEBUG] Admin dir structure missing!"

# Deploy the app to a clean directory with production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @vendin/tenant-instance --prod deploy /app/deploy

# Copy the build output (dist)
RUN cp -a /app/apps/tenant-instance/dist/. /app/deploy/

# Copy the .medusa directory which contains admin dashboard build
# medusa build creates files in .medusa/client/ in some versions, but runtime expects them in .medusa/server/public/admin/
# We ensure the structure exists in the deployment directory
RUN if [ -d "/app/apps/tenant-instance/.medusa" ]; then \
    cp -a /app/apps/tenant-instance/.medusa /app/deploy/; \
    if [ -d "/app/apps/tenant-instance/.medusa/client" ]; then \
    mkdir -p /app/deploy/.medusa/server/public && \
    cp -r /app/apps/tenant-instance/.medusa/client /app/deploy/.medusa/server/public/admin; \
    fi \
    else \
    echo "Warning: .medusa directory not found!"; \
    fi


# Stage 4: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy the deployed application
COPY --from=builder /app/deploy .

# Set production environment
ENV NODE_ENV=production

# Expose ports
EXPOSE 9000 5173

# Ensure start.sh is executable
RUN chmod +x ./start.sh

# Start
ENTRYPOINT ["./start.sh"]
