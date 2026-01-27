# Stage 1: Builder
FROM node:20-slim as builder

WORKDIR /app

# Install Bun for fast dependency installation
RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Copy workspace configuration
COPY package.json bun.lock turbo.json ./
COPY apps/tenant-instance/package.json ./apps/tenant-instance/
COPY packages/analytics/package.json ./packages/analytics/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY packages/medusa/plugins/medusa-plugin-bling/package.json ./packages/medusa/plugins/medusa-plugin-bling/

# Install dependencies
RUN bun install

# Copy application code
COPY apps/tenant-instance ./apps/tenant-instance
COPY packages/analytics ./packages/analytics
COPY packages/config ./packages/config
COPY packages/utils ./packages/utils
COPY packages/medusa/plugins/medusa-plugin-bling ./packages/medusa/plugins/medusa-plugin-bling

# Build the application using npx/node
WORKDIR /app/apps/tenant-instance
ENV NODE_ENV=production
RUN npx medusa build

# Stage 2: Runner
FROM node:20-slim
WORKDIR /app/apps/tenant-instance

# Copy the entire workspace from builder
COPY --from=builder /app /app

ENV NODE_ENV=production
ENV MEDUSA_TELEMETRY_DISABLED=1

EXPOSE 9000

# Run with node/npx to ensure correct metadata discovery
CMD ["npx", "medusa", "start"]
