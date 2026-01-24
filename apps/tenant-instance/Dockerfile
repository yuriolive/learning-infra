FROM oven/bun:1.2.20

WORKDIR /app

# Install Node.js for MedusaJS build (fixes source map issue with Bun)
# Bun image is based on Debian, so we can install Node.js via apt
RUN apt-get update && \
    apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy package.json files
COPY package.json bun.lock turbo.json ./
COPY apps/tenant-instance/package.json ./apps/tenant-instance/

# Install dependencies
RUN bun install

# Copy application code
COPY apps/tenant-instance ./apps/tenant-instance

# Build the application
WORKDIR /app/apps/tenant-instance
ENV NODE_ENV=production
ENV MEDUSA_TELEMETRY_DISABLED=1
# Use npm/npx for build (fixes Bun source map issue with MedusaJS decorators)
# npx will use the installed Node.js instead of Bun
RUN bun run build

EXPOSE 9000

CMD ["bun", "run", "start"]
