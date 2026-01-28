# Stage 1: Runner
FROM node:20-alpine

# Install pnpm globally via Corepack (or npm)
RUN npm install -g pnpm

# Set working directory to /server
WORKDIR /server

# Copy entire context
COPY . .

# Create pnpm-workspace.yaml if not exists (though it should exist now) or ensure correct context
# (Assuming pnpm-workspace.yaml is copied with COPY . .)

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Set working directory to the app
WORKDIR /server/apps/tenant-instance

# Give execution permission to start.sh
RUN chmod +x ./start.sh

# Expose backend and admin ports
EXPOSE 9000 5173

# Start with migrations and then the development server
ENTRYPOINT ["./start.sh"]
