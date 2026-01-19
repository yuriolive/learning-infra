# Learning Infrastructure - Multi-Tenant E-commerce Platform

Multi-tenant e-commerce platform using MedusaJS 2.0 with multi-instance provisioning. Each merchant gets a dedicated backend and database.

## Overview

This project uses a **monorepo architecture** with Turborepo and Bun workspaces to manage multiple applications and shared packages.

## Monorepo Structure

```
/
├── apps/
│   └── control-plane/      # Orchestrator API (tenant provisioning)
├── packages/
│   └── config/             # Shared config (ESLint, TS, Prettier)
└── infrastructure/         # Infrastructure as Code
```

## Prerequisites

- **Bun** >= 1.2.20 (package manager and runtime)
- Node.js >= 24.0.0

## Local Development

This project uses Docker Compose to run a local PostgreSQL instance for the Control Plane.

```bash
# Start local infrastructure
docker-compose up -d

# Stop local infrastructure
docker-compose down
```

### Database Setup (Control Plane)

1. Copy `.env.example` to `.env` in `apps/control-plane`:
   ```bash
   cp apps/control-plane/.env.example apps/control-plane/.env
   ```
2. Apply migrations:
   ```bash
   bun run db:push --filter=@learning-infra/control-plane
   ```

## Quick Start

```bash
# Install dependencies
bun install

# Run all apps in development mode
bun run dev

# Build all apps and packages
bun run build

# Run all tests
bun run test

# Type check all apps and packages
bun run typecheck

# Lint all apps and packages
bun run lint

# Auto-fix linting issues
bun run lint:fix
```

## Commands

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `bun run dev`       | Start all apps in development mode   |
| `bun run build`     | Build all apps and packages          |
| `bun run lint`      | Lint all apps and packages           |
| `bun run lint:fix`  | Auto-fix lint issues                 |
| `bun run test`      | Run all tests                        |
| `bun run typecheck` | Type check all apps and packages     |

## Applications

### Control Plane (`apps/control-plane/`)

Orchestrator API for managing tenant provisioning in the multi-tenant e-commerce platform.

- RESTful API with tenant provisioning endpoints
- Domain-driven design structure
- In-memory storage (will be replaced with PostgreSQL)
- Comprehensive unit test suite (96% coverage)

See [`apps/control-plane/README.md`](apps/control-plane/README.md) for details.

## Packages

### Config (`packages/config/`)

Shared configuration for all apps and packages:

- ESLint configuration
- TypeScript base configuration
- Prettier configuration

## Technology Stack

- **Package Manager**: Bun
- **Monorepo**: Turborepo
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

## Development Guidelines

- All backend code must be TypeScript (strict mode)
- Follow domain-driven design patterns
- Maintain strict tenant isolation (non-negotiable)
- Use serverless-first infrastructure
- See [AGENTS.md](AGENTS.md) for detailed architecture

## Documentation

- **Architecture**: See [AGENTS.md](AGENTS.md)
- **Requirements**: See [PRD.md](PRD.md)
- **Roadmap**: See [ROADMAP.md](ROADMAP.md)
