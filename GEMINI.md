# Medusify - Multi-Tenant E-commerce Platform

## Project Overview
Medusify is a multi-tenant e-commerce platform built with MedusaJS 2.0. It uses a **Multi-Instance Provisioning model** where each merchant gets a dedicated backend and database.

## Core Principles
- **True Isolation**: Physical database separation per tenant.
- **Serverless-First**: Scale-to-zero compute (Google Cloud Run), serverless DB (Neon), and serverless cache (Upstash Redis).
- **TypeScript Only**: All backend code must be TypeScript.
- **Performance**: Store provisioning in < 2 minutes.

## Code Structure
- `/control-plane/`: Orchestrator API for tenant management.
- `/tenant-instance/`: MedusaJS template for individual stores.
- `/storefront/`: Multi-tenant Next.js storefront.
- `/infrastructure/`: IaC for platform resources.
- `/shared/`: Common utilities and types.

## Development Guidelines
- Always maintain tenant isolation.
- Use `context7` MCP for documentation on MedusaJS 2.0, Neon API, Google Cloud Run, and Cloudflare.
- Follow Conventional Commits.
- Proactively manage GitHub project tasks and issues.
