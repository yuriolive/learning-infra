# Stage 1: Base
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate && corepack prepare turbo@2.6.1 --activate
WORKDIR /app

# Stage 2: Pruner
FROM base AS pruner
COPY . .
RUN turbo prune --scope=@vendin/tenant-instance --docker

# Stage 3: Builder
FROM base AS builder
WORKDIR /app

# Copy lockfile and package.json's of isolated subworkspace
COPY --from=pruner /app/out/json/ /app/out/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code of isolated subworkspace
COPY --from=pruner /app/out/full/ .

# Build the project
RUN pnpm build --filter=@vendin/tenant-instance...

# Stage 4: Deployer
FROM base AS deployer
WORKDIR /app
COPY --from=builder /app .

# Deploy the app to a clean directory with production dependencies
RUN pnpm --filter @vendin/tenant-instance --prod deploy /app/deploy

# Copy the build output (dist) as it is ignored by .gitignore (and thus pnpm deploy)
COPY --from=builder /app/apps/tenant-instance/dist /app/deploy/dist

# Stage 5: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Enable corepack
RUN corepack enable

# Copy the deployed application
COPY --from=deployer /app/deploy .

# Set production environment
ENV NODE_ENV=production

# Expose ports
EXPOSE 9000 5173

# Ensure start.sh is executable
RUN chmod +x ./start.sh

# Start
ENTRYPOINT ["./start.sh"]
