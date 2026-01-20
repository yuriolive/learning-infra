FROM oven/bun:1.2.20-slim AS base
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS builder
COPY package.json bun.lock turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY apps/control-plane/package.json ./apps/control-plane/
COPY apps/storefront/package.json ./apps/storefront/

# Install dependencies including workspaces
RUN bun install --frozen-lockfile

# Copy source code
COPY packages/config ./packages/config
COPY packages/utils ./packages/utils
COPY apps/storefront ./apps/storefront

# Build the application
RUN bun run build --filter=storefront

# Stage 2: Production image
FROM base AS runner
# Set production environment
ENV NODE_ENV=production

# Copy built application and necessary node_modules
# Next.js standalone output contains a minimal server and dependencies
COPY --from=builder /app/apps/storefront/.next/standalone ./
COPY --from=builder /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public

# Expose the port the app runs on
EXPOSE 3000

# Set the entrypoint to run the compiled file
CMD ["bun", "apps/storefront/server.js"]
