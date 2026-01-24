FROM oven/bun:1.2.20

WORKDIR /app

# Copy package.json files
COPY package.json bun.lock turbo.json ./
COPY apps/tenant-instance/package.json ./apps/tenant-instance/

# Install dependencies
RUN bun install

# Copy application code
COPY apps/tenant-instance ./apps/tenant-instance

# Build the application
WORKDIR /app/apps/tenant-instance
RUN bun run build

EXPOSE 9000

CMD ["bun", "run", "start"]
