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

# Build the project
RUN pnpm build --filter=@vendin/tenant-instance...

# Deploy the app to a clean directory with production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @vendin/tenant-instance --prod deploy /app/deploy

# Copy the build output (dist contains backend and admin artifacts)
RUN cp -r /app/apps/tenant-instance/dist/. /app/deploy/

# In Medusa v2 Framework, admin artifacts might be expected in .medusa/server/public/admin
RUN mkdir -p /app/deploy/.medusa/server/public && \
    cp -r /app/apps/tenant-instance/dist/public/admin /app/deploy/.medusa/server/public/

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
