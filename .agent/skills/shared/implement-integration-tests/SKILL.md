---
name: implement-integration-tests
description: Expands integration test coverage for the control-plane and storefront apps using Testcontainers (real PostgreSQL and Redis containers). Use when asked to add Testcontainers integration tests, expand integration test coverage, test hostname resolution, or test cache behaviour. Corresponds to task T3 in docs/test/IMPLEMENTATION.md.
---

# Implement Integration Tests

Adds Testcontainers-based integration tests for scenarios that PGLite cannot handle: Redis cache, persistent connections, and storefront hostname resolution.

## Project Documentation References

- **[@testing-strategy.md](../../../rules/shared/testing/testing-strategy.md)** - Testing patterns and strategies
- **[STRATEGY.md](../../../../docs/test/STRATEGY.md)** - Full platform test strategy (Layer 2)
- **[CURRENT_STATE.md](../../../../docs/test/CURRENT_STATE.md)** - Existing PGLite setup to preserve
- **[IMPLEMENTATION.md](../../../../docs/test/IMPLEMENTATION.md)** - Task T3 prompt and acceptance criteria

## Context

The control-plane already uses PGLite for repository, service, and route tests. Keep those as-is. Testcontainers is only for:

- **Redis cache tests** — hit/miss/expiry against a real Redis instance
- **Hostname resolution tests** — storefront resolves hostname → tenant config via the control-plane
- **Any PGLite gap** — pg extensions, persistent connections across test suites

## Workflow

### Step 1: Read existing tests

```
apps/control-plane/tests/utils/mock-database.ts
apps/control-plane/tests/unit/tenants/tenant.repository.test.ts
apps/control-plane/vitest.config.ts
```

### Step 2: Add dependencies

```bash
pnpm --filter @vendin/control-plane add -D @testcontainers/postgresql @testcontainers/redis
```

### Step 3: Create container helpers

Create `apps/control-plane/tests/utils/test-containers.ts` with `startPostgres()` and `startRedis()` helpers. Each returns a started container and a cleanup function. Use `afterAll` to stop containers.

### Step 4: Write tests

- `tests/integration/hostname-resolution.test.ts` — storefront hostname → tenant lookup
- `tests/integration/cache.test.ts` — cache hit, miss, TTL expiry

### Step 5: Verify

```bash
pnpm --filter @vendin/control-plane test
```

## Constraints

- Do not replace PGLite — it is faster and correct for existing tests
- Container cleanup must run in `afterAll`, even on test failure
- Tests must work in CI (Testcontainers auto-detects Docker socket)
