# Test Architecture - Planned Improvements

**Target Phase**: Phase 2 (Production Ready)  
**Priority**: P1  
**Timeline**: To be scheduled

## Goals

1. **Speed**: Reduce test suite time from ~53s to ~3 minutes (excluding E2E)
2. **Organization**: Clear separation of unit, integration, API, and E2E tests
3. **Fidelity**: Add E2E tests for real infrastructure provisioning
4. **Maintainability**: Simpler mocks, clearer test boundaries

## Test Type Strategy

### Unit Tests (New)

**What to test**:

- Business logic in services (domain validation, status transitions)
- Input validators and sanitizers
- Utility functions
- Error handling logic

**What NOT to test**:

- Database queries (integration tests)
- HTTP routing (API tests)
- Real infrastructure (E2E tests)

**Dependencies**: All external dependencies mocked

**Speed Target**: 10-50ms per test

### Integration Tests (Refactor Current)

**What to test**:

- Repository SQL queries via PGLite
- Service + Repository workflows
- Database constraints and transactions
- Data transformations with real DB types

**Dependencies**: PGLite only

**Speed Target**: 1-5 seconds per test

### API Tests (Keep Current, Move)

**What to test**:

- HTTP status codes and headers
- JSON request/response serialization
- Request validation middleware
- Error response formatting

**Dependencies**: PGLite + route handlers

**Speed Target**: 1-5 seconds per test

### E2E Tests (New)

**What to test**:

- Real Neon database creation
- Real Cloud Run service deployment
- Full tenant provisioning flow
- Cleanup and rollback mechanisms

**Dependencies**: Real Neon, GCP, Cloudflare

**Speed Target**: 30-120 seconds per test

## Detailed Refactoring Plan

### Task 1: Create Unit Tests for Services

**File**: `tests/unit/services/tenant.service.test.ts`

**Changes**:

1. Mock `TenantRepository` using Vitest mocks
2. Focus on business logic only
3. Test edge cases and error handling

**Example**:

```typescript
import { describe, expect, it, vi } from "vitest";
import { TenantService } from "../../../src/domains/tenants/tenant.service";
import type { TenantRepository } from "../../../src/domains/tenants/tenant.repository";

describe("TenantService (Unit)", () => {
  describe("createTenant", () => {
    it("should check domain uniqueness before creating", async () => {
      const mockRepo: Partial<TenantRepository> = {
        findByDomain: vi.fn().mockResolvedValue({ id: "existing" }),
        create: vi.fn(),
      };

      const service = new TenantService(mockRepo as TenantRepository);

      await expect(
        service.createTenant({ name: "Store", domain: "taken" }),
      ).rejects.toThrow("Domain already in use");

      expect(mockRepo.findByDomain).toHaveBeenCalledWith("taken");
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("should create tenant when domain is unique", async () => {
      const mockRepo: Partial<TenantRepository> = {
        findByDomain: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "new-id",
          name: "Store",
          domain: "unique",
          status: "active",
        }),
      };

      const service = new TenantService(mockRepo as TenantRepository);

      const result = await service.createTenant({
        name: "Store",
        domain: "unique",
      });

      expect(result.id).toBe("new-id");
      expect(mockRepo.findByDomain).toHaveBeenCalledWith("unique");
      expect(mockRepo.create).toHaveBeenCalled();
    });
  });
});
```

**Benefits**:

- Tests run in **< 10ms** (100x faster)
- No PGLite initialization overhead
- Focus on business logic only
- Easy to test error conditions

### Task 2: Move Repository Tests to Integration

**File**: `tests/integration/repositories/tenant.repository.test.ts`

**Changes**:

1. Move from `tests/unit/` to `tests/integration/repositories/`
2. Keep PGLite usage (already correct)
3. Add more constraint violation tests
4. Add transaction tests (when implemented)

**No code changes needed** - just directory reorganization.

### Task 3: Create Validator Unit Tests

**File**: `tests/unit/validators/tenant.validators.test.ts`

**Purpose**: Test input validation logic

```typescript
import { describe, expect, it } from "vitest";
import {
  validateTenantId,
  validateDomain,
} from "../../../src/domains/tenants/tenant.validators";

describe("Tenant Validators (Unit)", () => {
  describe("validateTenantId", () => {
    it("should accept valid UUIDs", () => {
      expect(validateTenantId("550e8400-e29b-41d4-a716-446655440000")).toBe(
        true,
      );
    });

    it("should reject invalid UUIDs", () => {
      expect(validateTenantId("not-a-uuid")).toBe(false);
      expect(validateTenantId("")).toBe(false);
    });
  });

  describe("validateDomain", () => {
    it("should accept valid domain names", () => {
      expect(validateDomain("my-store")).toBe(true);
      expect(validateDomain("store123")).toBe(true);
    });

    it("should reject invalid domain names", () => {
      expect(validateDomain("invalid_domain")).toBe(false); // underscores not allowed
      expect(validateDomain("UPPERCASE")).toBe(false); // must be lowercase
      expect(validateDomain("a")).toBe(false); // too short
    });
  });
});
```

### Task 4: Create Workflow Integration Tests

**File**: `tests/integration/workflows/tenant-lifecycle.integration.test.ts`

**Purpose**: Test multi-component flows with real database

```typescript
describe("Tenant Lifecycle (Integration)", () => {
  let db: ReturnType<typeof drizzle>;
  let repository: TenantRepository;
  let service: TenantService;

  beforeEach(async () => {
    db = await createMockDatabase();
    repository = new TenantRepository(db);
    service = new TenantService(repository);
  });

  it("should handle concurrent domain conflicts correctly", async () => {
    await service.createTenant({ name: "Store 1", domain: "shop" });

    // Try to create duplicate concurrently
    const promises = [
      service.createTenant({ name: "Store 2", domain: "shop" }),
      service.createTenant({ name: "Store 3", domain: "shop" }),
    ];

    const results = await Promise.allSettled(promises);

    // Both should fail
    expect(results[0].status).toBe("rejected");
    expect(results[1].status).toBe("rejected");
  });

  it("should maintain isolation when updating domains", async () => {
    const tenant1 = await service.createTenant({
      name: "Store 1",
      domain: "shop1",
    });
    const tenant2 = await service.createTenant({
      name: "Store 2",
      domain: "shop2",
    });

    // Can't update to existing domain
    await expect(
      service.updateTenant(tenant1.id, { domain: "shop2" }),
    ).rejects.toThrow("Domain already in use");

    // Can update to own domain
    await expect(
      service.updateTenant(tenant1.id, { domain: "shop1", name: "Updated" }),
    ).resolves.toMatchObject({ name: "Updated", domain: "shop1" });
  });
});
```

### Task 5: Create E2E Tests

**Files**:

- `tests/e2e/provisioning/neon-database.e2e.test.ts`
- `tests/e2e/provisioning/cloud-run-deployment.e2e.test.ts`
- `tests/e2e/provisioning/tenant-provisioning.e2e.test.ts`

**Setup Required**:

1. Neon test project with API key
2. GCP test project with service account
3. Test environment configuration
4. Cleanup scripts for test resources

**Example**:

```typescript
describe("Tenant Provisioning (E2E)", () => {
  it("should provision a complete tenant in under 2 minutes", async () => {
    const startTime = Date.now();

    // Create tenant via Control Plane API
    const response = await fetch(
      "https://test-control.vendin.store/api/tenants",
      {
        method: "POST",
        body: JSON.stringify({
          name: "E2E Test Store",
          domain: "e2e-test",
        }),
      },
    );

    const tenant = await response.json();
    expect(response.status).toBe(201);

    // Wait for provisioning to complete
    let status = "provisioning";
    while (status === "provisioning") {
      const statusResponse = await fetch(
        `https://test-control.vendin.store/api/tenants/${tenant.id}`,
      );
      const data = await statusResponse.json();
      status = data.status;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    expect(status).toBe("active");
    expect(Date.now() - startTime).toBeLessThan(120_000); // 2 minutes

    // Verify Neon database is accessible
    const db = postgres(tenant.databaseUrl);
    await expect(db`SELECT 1`).resolves.toBeTruthy();

    // Verify Cloud Run service is healthy
    const healthCheck = await fetch(tenant.apiUrl + "/health");
    expect(healthCheck.status).toBe(200);

    // Cleanup
    await fetch(`https://test-control.vendin.store/api/tenants/${tenant.id}`, {
      method: "DELETE",
    });
  }, 180_000); // 3 minute timeout
});
```

## Test Speed Optimization

### Parallel Test Execution

```typescript:vitest.config.ts
export default defineConfig({
  test: {
    pool: "threads",
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
  },
});
```

### Test Isolation with fileScope

```typescript:vitest.config.ts
export default defineConfig({
  test: {
    isolate: true, // Each test file gets isolated context
    poolOptions: {
      threads: {
        singleThread: false, // Allow parallel execution
      },
    },
  },
});
```

## CI/CD Integration

### Test Stages in CI

```yaml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm run test:unit
      - duration: ~10 seconds

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - run: pnpm run test:integration
      - duration: ~3 minutes

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.ref == 'refs/heads/main'
    steps:
      - run: pnpm run test:e2e
      - duration: ~10 minutes
```

### Package Scripts (Planned)

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration tests/api",
    "test:e2e": "vitest run tests/e2e",
    "test:watch": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

## Success Metrics

### Phase 2 Completion Criteria

- ✅ Service tests use repository mocks (< 100ms total)
- ✅ Test directories reorganized (unit/integration/api)
- ✅ Validator unit tests created
- ✅ Integration workflow tests created
- ✅ Test suite completes in < 3 minutes

### Phase 3 Completion Criteria

- ✅ E2E tests for Neon provisioning
- ✅ E2E tests for Cloud Run deployment
- ✅ Full provisioning flow E2E test
- ✅ E2E tests run in CI on staging
- ✅ Cleanup mechanisms for test resources

## Implementation Order

1. **Week 1**: Refactor service tests to use mocks (Task 2)
2. **Week 2**: Reorganize test directories (Task 1)
3. **Week 3**: Create validator tests (Task 3)
4. **Week 4**: Create workflow integration tests (Task 4)
5. **Later**: E2E tests (Task 5) - when provisioning is implemented

## Notes

- Current PGLite implementation is **correct for repository tests**
- Service tests will benefit most from refactoring (100x speed improvement)
- E2E tests should only run on staging/pre-production
- Keep test isolation as top priority (no shared state)
