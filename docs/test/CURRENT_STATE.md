# Test Architecture - Current State

**Last Updated**: 2026-01-20  
**Status**: ✅ Phase 1 Complete  
**Component**: `apps/control-plane/tests/`

## Overview

The Control Plane currently has 43 passing unit tests that use **PGLite** (in-memory PostgreSQL) for database operations. All tests run with isolated database instances to ensure test independence.

## Test Structure

```
apps/control-plane/tests/
├── unit/
│   └── tenants/
│       ├── tenant.repository.test.ts    # 16 tests (Repository + DB)
│       ├── tenant.service.test.ts       # 14 tests (Service + Repository + DB)
│       └── tenant.routes.test.ts        # 13 tests (Routes + Service + Repository + DB)
└── utils/
    └── mock-database.ts                 # PGLite helper
```

## Test Types (Current)

### Repository Tests - `tenant.repository.test.ts`

- **Type**: Integration (touches database)
- **Dependencies**: PGLite (in-memory PostgreSQL)
- **Speed**: 2-7 seconds per test
- **Coverage**: 16 tests
- **What it tests**:
  - SQL queries via Drizzle ORM
  - Database constraints (unique domain)
  - CRUD operations
  - Soft delete behavior
  - UUID generation and timestamps

### Service Tests - `tenant.service.test.ts`

- **Type**: Integration (uses real repository + database)
- **Dependencies**: `TenantRepository` + PGLite
- **Speed**: 2-7 seconds per test
- **Coverage**: 14 tests
- **What it tests**:
  - Business logic with real database
  - Domain uniqueness validation
  - Tenant CRUD workflows
  - Error handling with real DB errors

### Route Tests - `tenant.routes.test.ts`

- **Type**: API Integration (HTTP + Service + DB)
- **Dependencies**: Routes + `TenantService` + `TenantRepository` + PGLite
- **Speed**: 2-8 seconds per test
- **Coverage**: 13 tests
- **What it tests**:
  - HTTP status codes
  - JSON serialization
  - Request validation
  - Error responses

## PGLite Implementation

### Mock Database Helper

```typescript:apps/control-plane/tests/utils/mock-database.ts
import * as PGLiteModule from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

export async function createMockDatabase() {
  const PGLite = (PGLiteModule as any).PGlite || PGLiteModule.default?.PGlite || PGLiteModule.default;
  const client = new PGLite();
  const db = drizzle(client, { schema });

  // Apply migrations
  await migrate(db, { migrationsFolder: "../../drizzle" });

  return db;
}
```

### Test Pattern

```typescript
describe("TenantRepository", () => {
  let repository: TenantRepository;

  beforeEach(async () => {
    const db = await createMockDatabase(); // Fresh isolated instance
    repository = new TenantRepository(db);
  });

  it("should create tenant", async () => {
    const tenant = await repository.create({ name: "Store 1" });
    expect(tenant.id).toBeDefined();
  });
});
```

### Dependency Injection in Repository

```typescript:apps/control-plane/src/domains/tenants/tenant.repository.ts
export class TenantRepository {
  private db: typeof database;

  constructor(db?: typeof database) {
    this.db = db ?? database; // Use injected for tests, global for production
  }

  async create(input: CreateTenantInput): Promise<Tenant> {
    const [tenant] = await this.db
      .insert(tenants)
      .values(input)
      .returning();
    return mapToTenant(tenant);
  }
}
```

## Test Isolation

Each test gets a **fresh PGLite instance**:

- ✅ No shared state between tests
- ✅ Real PostgreSQL behavior (UUID, JSONB, constraints)
- ✅ Migrations applied automatically
- ✅ Tests can run in parallel

## Test Execution

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Coverage
bun run test:coverage
```

**Current Performance**:

- Total: 43 tests passing
- Duration: ~53 seconds (including PGLite initialization)
- Average: ~1.2 seconds per test

## Dependencies

```json
{
  "devDependencies": {
    "@electric-sql/pglite": "^0.3.15",
    "vitest": "^3.2.4"
  }
}
```

## Environment Configuration

```typescript:vitest.config.ts
export default defineConfig({
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/postgres"
    }
  }
});
```

## Known Limitations

1. **Test Speed**: 2-7 seconds per test is slower than pure unit tests
2. **Service Tests**: Using PGLite instead of mocking repository
3. **Test Isolation**: Each test initializes PGLite + migrations (~2-3s overhead)
4. **No E2E Tests**: Only testing in-memory behavior, not real infrastructure

## What Works Well

✅ Real PostgreSQL behavior (no mock fragility)  
✅ Drizzle queries work exactly as in production  
✅ UUID validation and constraints enforced  
✅ JSONB and timestamp handling correct  
✅ Test isolation guaranteed  
✅ Simple to maintain (no complex mocks)
