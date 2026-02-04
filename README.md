# Vendin - Multi-Tenant E-commerce Platform

Multi-tenant e-commerce platform using MedusaJS 2.0 with multi-instance provisioning. Each merchant gets a dedicated backend and database.

## Overview

This project uses a **monorepo architecture** with Turborepo and PNPM workspaces to manage multiple applications and shared packages.

## Monorepo Structure

```
/
├── apps/
│   ├── control-plane/      # Orchestrator API (tenant provisioning)
│   ├── marketing/          # Marketing landing app (root domain)
│   ├── storefront/         # Router-only storefront (tenant domains)
│   └── tenant-instance/    # MedusaJS template (per-tenant)
├── packages/
│   └── config/             # Shared config (ESLint, TS, Prettier)
└── docs/                   # Architecture and setup guides
```

## Prerequisites

- **PNPM** >= 9.15.4 (package manager)
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
   pnpm run db:push --filter=@vendin/control-plane
   ```

## Quick Start

```bash
# Install dependencies
pnpm install

# Run all apps in development mode
pnpm run dev

# Build all apps and packages
pnpm run build

# Run all tests
pnpm run test

# Type check all apps and packages
pnpm run typecheck

# Lint all apps and packages
pnpm run lint

# Auto-fix linting issues
pnpm run lint:fix
```

## Commands

| Command              | Description                        |
| -------------------- | ---------------------------------- |
| `pnpm run dev`       | Start all apps in development mode |
| `pnpm run build`     | Build all apps and packages        |
| `pnpm run lint`      | Lint all apps and packages         |
| `pnpm run lint:fix`  | Auto-fix lint issues               |
| `pnpm run test`      | Run all tests                      |
| `pnpm run typecheck` | Type check all apps and packages   |

## Applications

### Control Plane (`apps/control-plane/`)

### Control Plane (`apps/control-plane/`)

Orchestrator API for managing tenant provisioning and **secure proxy access**.

- RESTful API with tenant provisioning endpoints
- **Proxy Service**: Securely forwards requests to private Tenant Instances via Google IAM
- Domain-driven design structure
- In-memory storage (will be replaced with PostgreSQL)
- Comprehensive unit test suite (96% coverage)

See [`apps/control-plane/README.md`](apps/control-plane/README.md) for details.

### Marketing App (`apps/marketing/`)

Marketing landing page and **Unified Admin Dashboard**.

- Landing page, pricing, and signup
- **Authentication Provider**: Manages user sessions via Better Auth
- **Admin Proxy**: Proxies admin requests to Control Plane via Cloudflare Service Bindings
- Deployed to Cloudflare Pages on root domain (`vendin.store`)

### Storefront Router (`apps/storefront/`)

Router-only Next.js app for tenant domain routing.

- Resolves tenant by hostname
- **Store Proxy**: Securely proxies customer requests to private Tenant Instances
- Deployed to Cloudflare Pages for tenant subdomains
- Does not render customer UI (tenant instances serve custom UI via proxy)

### Tenant Instance (`apps/tenant-instance/`)

MedusaJS 2.0 template for individual merchant stores.

- **Private Service**: Running on Cloud Run with `ingress: all` (IAM Auth only)
- Custom storefront UI per tenant (themes, customizations)
- Store API (`/store`) for customer operations
- Admin Dashboard (`/admin`) for merchant management
- Dedicated database per tenant (Neon PostgreSQL)
- Deployed on Google Cloud Run with scale-to-zero

## Packages

### Config (`packages/config/`)

Shared configuration for all apps and packages:

- ESLint configuration
- TypeScript base configuration
- Prettier configuration

## Technology Stack

- **Package Manager**: PNPM
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

- **Architecture**: See [docs/architecture/README.md](docs/architecture/README.md)
- **Agent Guidelines**: See [AGENTS.md](AGENTS.md)
- **Requirements**: See [PRD.md](PRD.md)
- **Roadmap**: See [ROADMAP.md](ROADMAP.md)
