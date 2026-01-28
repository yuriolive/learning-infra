# Stage 1: Base
FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /server

# Stage 2: Builder
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @vendin/tenant-instance build

# Stage 3: Production Deploy
FROM base AS deploy
COPY . .
RUN pnpm install --frozen-lockfile
# Use pnpm deploy to isolate the app and its production dependencies
RUN pnpm --filter @vendin/tenant-instance --prod deploy /server/app

# Stage 4: Runner (Production optimized)
FROM node:20-alpine AS runner
WORKDIR /server

# Copy the deployed bundle (flattened)
COPY --from=deploy /server/app .

# Expose backend and admin ports
EXPOSE 9000 5173

# Ensure start.sh is executable
RUN chmod +x ./start.sh

# Start with our script
ENTRYPOINT ["./start.sh"]
