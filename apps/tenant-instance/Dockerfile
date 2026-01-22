FROM oven/bun:1.2.20

WORKDIR /app

# Copy package.json files for all workspaces
COPY package.json bun.lock turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY apps/control-plane/package.json ./apps/control-plane/
COPY apps/storefront/package.json ./apps/storefront/
COPY apps/tenant-instance/package.json ./apps/tenant-instance/

# Install dependencies
RUN bun install

# Copy application code
COPY . .

# Build the application
WORKDIR /app/apps/tenant-instance
RUN bun run build

EXPOSE 9000

CMD ["bun", "run", "start"]
