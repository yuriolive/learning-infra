---
description: General coding standards, non-negotiables, and code review checklist.
globs: **/*
---
# Coding Standards & Guidelines

## Core Principles
✅ **DRY (Don't Repeat Yourself)**: Extract common logic into shared utilities or components.
✅ **Succinctness**: Keep code and documentation direct and concise. Avoid wordiness.
✅ **Isolation**: Always maintain physical database isolation per tenant.

## What NOT to Do
❌ **NEVER** share databases between tenants.
❌ **NEVER** use shared-database multi-tenancy patterns.
❌ **NEVER** hardcode tenant IDs or connection strings.
❌ **NEVER** skip tenant isolation checks.
❌ **NEVER** use non-serverless infrastructure without justification.
❌ **NEVER** write backend code in JavaScript (use TypeScript).
❌ **NEVER** expose tenant data to other tenants.
❌ **NEVER** use `console.log/error/warn/info` in source code (use pino logger).

## What to Do
✅ **ALWAYS** maintain physical database isolation.
✅ **ALWAYS** use TypeScript for backend code.
✅ **ALWAYS** implement proper error handling.
✅ **ALWAYS** test tenant isolation.
✅ **ALWAYS** use serverless infrastructure.
✅ **ALWAYS** configure scale-to-zero for Cloud Run.
✅ **ALWAYS** store secrets securely.
✅ **ALWAYS** use structured logging via `@vendin/utils/logger` (pino).
✅ **ALWAYS** log with tenant context when applicable.

## Logging Standards

Use pino logger from `@vendin/utils` for all logging.

**Enforcement:**
- ESLint rule `no-console: error` prevents console usage in source code
- Exception: Console allowed in test files for debugging
- See [@utils-package.md](../../packages/utils-package.md) for logger implementation
- See [docs/examples/logger-usage.ts](../../../docs/examples/logger-usage.ts) for usage examples

## Code Review Checklist
- [ ] Tenant isolation maintained?
- [ ] Serverless infrastructure used?
- [ ] TypeScript used for backend?
- [ ] Secrets handled securely?
- [ ] Error handling implemented?
- [ ] Tests added/updated?
- [ ] Code is DRY and succinct?
- [ ] Pino logger used (no console.log)?

## References

- **Pre-commit verification**: See [@git-conventions.md](../git/git-conventions.md)
- **Logging patterns**: See [@utils-package.md](../../packages/utils-package.md)
- **Logger examples**: See [docs/examples/logger-usage.ts](../../../docs/examples/logger-usage.ts)
- **Architecture**: See [AGENTS.md](../../../AGENTS.md)
- **Tenant isolation**: See [AGENTS.md](../../../AGENTS.md#key-constraints)
