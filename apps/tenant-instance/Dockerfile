# Stage 1: Runner
FROM node:20-alpine

# Install pnpm globally
RUN npm install pnpm -g

# Set working directory to /server
WORKDIR /server

# Copy entire context
COPY . .

# Remove packageManager field to avoid pnpm error since root uses bun
RUN sed -i '/"packageManager":/d' package.json

# Create pnpm-workspace.yaml to ensure pnpm identifies the monorepo
RUN printf "packages:\n  - 'apps/*'\n  - 'packages/*'\n  - 'packages/*/plugins/*'\n" > pnpm-workspace.yaml

# Install dependencies using pnpm
RUN pnpm install --no-frozen-lockfile

# Set working directory to the app
WORKDIR /server/apps/tenant-instance

# Give execution permission to start.sh
RUN chmod +x ./start.sh

# Expose backend and admin ports
EXPOSE 9000 5173

# Start with migrations and then the development server
ENTRYPOINT ["./start.sh"]
