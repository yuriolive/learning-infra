# Claude Skills for Multi-Tenant E-commerce Platform

This directory contains Claude Skills for the multi-tenant e-commerce platform project. Skills are task-oriented workflows that extend Claude's capabilities for this codebase.

## Implemented Skills

### shared/implement-integration-tests

**Location**: `.agent/skills/shared/implement-integration-tests/`

Adds Testcontainers-based integration tests for Redis cache and hostname resolution flows that PGLite cannot cover. Keeps existing PGLite tests intact.

**Use when**: Adding Testcontainers integration tests, expanding integration test coverage, testing cache behaviour, or testing storefront hostname resolution. (Task T3 in `docs/test/IMPLEMENTATION.md`)

### shared/setup-demo-store

**Location**: `.agent/skills/shared/setup-demo-store/`

Provisions a persistent demo tenant in the staging environment and seeds it with realistic product, customer, and order data. Creates idempotent provision and seed scripts.

**Use when**: Setting up the staging demo store, seeding staging data, or resetting the demo store. (Task T2 in `docs/test/IMPLEMENTATION.md`)

### shared/implement-smoke-tests

**Location**: `.agent/skills/shared/implement-smoke-tests/`

Creates post-deploy smoke tests that verify critical endpoints after each staging or production deploy. Blocks staging deploys and triggers Cloud Run rollback on production if smoke fails.

**Use when**: Adding smoke tests, post-deploy health checks, or setting up automatic rollback. (Task T4 in `docs/test/IMPLEMENTATION.md`)

### shared/implement-e2e-tests

**Location**: `.agent/skills/shared/implement-e2e-tests/`

Creates Playwright E2E tests covering merchant signup, merchant dashboard, storefront browsing, and customer checkout. Tests run against the persistent demo store in staging.

**Use when**: Adding Playwright tests, writing end-to-end tests, testing the merchant or customer flows. (Task T5 in `docs/test/IMPLEMENTATION.md`)

### shared/implement-provisioning-tests

**Location**: `.agent/skills/shared/implement-provisioning-tests/`

Creates nightly tests that provision a real ephemeral tenant in staging, verify it works via smoke checks, then deprovision and confirm all cloud resources are cleaned up.

**Use when**: Adding provisioning tests, testing the full GCP Workflow lifecycle, testing tenant teardown, or setting up nightly tests. (Task T6 in `docs/test/IMPLEMENTATION.md`)

### shared/create-skill

**Location**: `.skills/skills/shared/create-skill/`

Helps create new Claude Skills following official format and learning-infra monorepo structure. Includes templates and validation tools.

**Use when**: Creating new Skills, migrating Cursor commands to Skills, or when asked to create a Skill.

### shared/debug-code

**Location**: `.skills/skills/shared/debug-code/`

Debugs code issues, errors, failing tests, and broken flows using a systematic workflow. Identifies root causes, applies minimal fixes, and validates solutions. Includes tenant isolation and provisioning debugging patterns.

**Use when**: Debugging errors, fixing failing tests, troubleshooting API endpoints, or resolving database issues.

### shared/review-code

**Location**: `.skills/skills/shared/review-code/`

Reviews code against project standards for architecture compliance, code quality, tenant isolation, and test coverage. Reviews for REST API patterns, provisioning workflows, and infrastructure best practices.

**Use when**: Reviewing code locally, reviewing specific files, or when asked to review code.

### shared/create-pull-request

**Location**: `.skills/skills/shared/create-pull-request/`

Creates a GitHub pull request using the project's PR template and standard workflows. Handles branch pushing and PR creation via GitHub CLI.

**Use when**: You have finished a task and are ready to submit changes for review.

### shared/github-project-management

**Location**: `.skills/skills/shared/github-project-management/`

Creates and manages GitHub issues and project items. Works with GitHub Projects v2 via MCP tools.

**Use when**: Creating GitHub issues, adding items to projects, or managing GitHub Project boards.

## Skills Organization

Skills are organized by scope in the monorepo:

- **Control Plane Skills** -> `.skills/skills/control-plane/` - For REST API, tenant provisioning, domain logic
- **Shared Skills** -> `.skills/skills/shared/` - For cross-app functionality
- **Infrastructure Skills** -> `.skills/skills/infrastructure/` - For Cloud Run, Cloudflare, Neon patterns

## Creating New Skills

To create a new Skill:

1. **Use the Create Skill Skill**: Ask Claude to "create a new Skill for [purpose]"
2. **Follow the workflow**: The Skill guides you through determining scope, choosing location, and structuring content.
3. **Reference Rules**: Always reference Cursor rules instead of duplicating their content to maintain DRY principles.

## Usage

Skills are automatically triggered by Claude based on natural language requests. Each Skill's description includes trigger keywords that match user requests.
