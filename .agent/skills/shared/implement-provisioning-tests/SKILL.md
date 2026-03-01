---
name: implement-provisioning-tests
description: Creates nightly tests that provision a real tenant from scratch in staging, verify it works, and tear it down completely. Tests the full GCP Workflow lifecycle including rollback. Use when asked to add provisioning tests, test tenant lifecycle, test GCP Workflow, test tenant teardown, or set up nightly tests. Corresponds to task T6 in docs/test/IMPLEMENTATION.md. Requires T4 (smoke tests) to be complete first.
---

# Implement Provisioning Tests

Creates a nightly lifecycle test that provisions an ephemeral tenant via the staging control-plane, verifies it is healthy using smoke checks, then deprovisions it and confirms all resources are cleaned up.

## Project Documentation References

- **[@provisioning.md](../../../rules/apps/control-plane/provisioning.md)** - Tenant provisioning patterns
- **[@cloud-run.md](../../../rules/infrastructure/cloud-run.md)** - Cloud Run deployment and cleanup
- **[@database.md](../../../rules/infrastructure/database.md)** - Neon DB creation and deletion
- **[STRATEGY.md](../../../../docs/test/STRATEGY.md)** - Layer 4 and Ephemeral Store sections
- **[IMPLEMENTATION.md](../../../../docs/test/IMPLEMENTATION.md)** - Task T6 prompt and acceptance criteria

## Prerequisites

- T4 (smoke tests) must be complete — the provisioning test reuses the smoke check logic to verify the provisioned store

## Workflow

### Step 1: Read provisioning patterns

```
gcp/workflows/provision-tenant.yaml
apps/control-plane/src/domains/tenants/tenant.routes.ts
scripts/smoke/smoke-test.ts
```

### Step 2: Create lifecycle test script

Create `scripts/staging/test-provisioning.ts`:

1. **Provision**: POST `/api/tenants` to staging control-plane with a timestamped domain (`nightly-YYYYMMDD-HHmm`)
2. **Poll**: Check tenant status every 10s, timeout at 10 minutes
3. **Verify**: Run smoke checks against the provisioned tenant (health + store API)
4. **Deprovision**: DELETE `/api/tenants/{id}`
5. **Verify cleanup**: Confirm the Neon DB is gone and Cloud Run revision is gone
6. **Always cleanup**: Use try/finally — cleanup runs even if verification fails

### Step 3: Create nightly workflow

Create `.github/workflows/nightly-provisioning.yml`:
- Schedule: `cron: '0 2 * * *'` (2am UTC)
- `workflow_dispatch` for manual runs
- Timeout: 20 minutes
- On failure: create a GitHub issue with the error log using `gh issue create`
- Always run cleanup step (use `if: always()`)

### Step 4: Verify locally

```bash
STAGING_CONTROL_PLANE_URL=https://... tsx scripts/staging/test-provisioning.ts
```

## Constraints

- Cleanup MUST run even if the test fails — leaked Cloud Run revisions and Neon DBs cost money
- Domain names must include timestamps to avoid conflicts between concurrent runs
- Never run against production — script must validate `STAGING_CONTROL_PLANE_URL` does not contain "prod"
- Total script timeout: 15 minutes; workflow timeout: 20 minutes
- GitHub issue created on failure must include: timestamp, domain used, step that failed, full error message
