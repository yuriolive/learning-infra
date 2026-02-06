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

# Build the project
RUN pnpm build --filter=@vendin/tenant-instance...

# Diagnostics to verify build artifacts
RUN ls -la /app/apps/tenant-instance/.medusa/server/public/admin || echo "[DEBUG] Admin dir missing!"
RUN if [ -f "/app/apps/tenant-instance/.medusa/server/public/admin/index.html" ]; then echo "[DEBUG] index.html found"; else echo "[DEBUG] index.html MISSING"; fi

# Deploy the app to a clean directory with production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @vendin/tenant-instance --prod deploy /app/deploy

# Copy the compiled backend code (dist directory contains transpiled TypeScript)
RUN cp -r /app/apps/tenant-instance/dist/. /app/deploy/

# Copy admin dashboard files from build output to runtime-expected location
# medusa build creates files in .medusa/client/, but runtime expects them in .medusa/server/public/admin/
RUN mkdir -p /app/deploy/.medusa/server/public && \
    cp -r /app/apps/tenant-instance/.medusa/client /app/deploy/.medusa/server/public/admin


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
