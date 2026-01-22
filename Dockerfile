# Use the official Bun image
FROM oven/bun:1.2.20-slim AS base
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS builder
COPY package.json bun.lock ./
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY packages/medusa-plugin-bling/package.json ./packages/medusa-plugin-bling/
COPY apps/control-plane/package.json ./apps/control-plane/
COPY apps/storefront/package.json ./apps/storefront/
COPY apps/tenant-instance/package.json ./apps/tenant-instance/

# Install dependencies including workspaces
RUN bun install --frozen-lockfile

# Copy source code
COPY packages/config ./packages/config
COPY packages/utils ./packages/utils
COPY apps/control-plane ./apps/control-plane
COPY turbo.json ./

# Build the application
RUN bun run build --filter=@vendin/control-plane

# Stage 2: Production image
FROM base AS runner
# Set production environment
ENV NODE_ENV=production

# Copy built application and necessary node_modules
# We need the node_modules from the builder for runtime dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/control-plane/package.json ./apps/control-plane/
COPY --from=builder /app/apps/control-plane/dist ./apps/control-plane/dist
COPY --from=builder /app/apps/control-plane/drizzle ./apps/control-plane/drizzle

# Copy utils package for workspace dependency resolution
COPY --from=builder /app/packages/utils/package.json ./packages/utils/
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist

# Expose the port the app runs on
EXPOSE 3000

# Set the entrypoint to run the compiled file
CMD ["bun", "/app/apps/control-plane/dist/src/index.js"]
