---
name: implement-smoke-tests
description: Creates post-deploy smoke tests that verify critical endpoints after each staging or production deploy. Blocks staging deploys and triggers Cloud Run rollback on production if smoke fails. Use when asked to add smoke tests, add post-deploy verification, test health endpoints after deploy, or set up rollback. Corresponds to task T4 in docs/test/IMPLEMENTATION.md. Requires T2 (demo store) to be complete first.
---

# Implement Smoke Tests

Creates a smoke test script and GitHub Actions job that runs after every deploy to verify the platform's critical endpoints are healthy.

## Project Documentation References

- **[@cloud-run.md](../../../rules/infrastructure/cloud-run.md)** - Cloud Run deployment patterns
- **[@cloudflare.md](../../../rules/infrastructure/cloudflare.md)** - Cloudflare deployment patterns
- **[STRATEGY.md](../../../../docs/test/STRATEGY.md)** - Deployment Guarantees section
- **[IMPLEMENTATION.md](../../../../docs/test/IMPLEMENTATION.md)** - Task T4 prompt and acceptance criteria
- **[DEMO_STORE.md](../../../../docs/test/DEMO_STORE.md)** - Demo store endpoint URLs

## Prerequisites

- T2 (demo store) must be provisioned — smoke tests verify the demo store storefront is reachable

## Workflow

### Step 1: Read existing deploy workflows

```
.github/workflows/deploy-control-plane.yml
.github/workflows/deploy-tenant-instance.yml
.github/workflows/deploy-storefront.yml
.staging/demo-store.json
```

### Step 2: Create smoke test script

Create `scripts/smoke/smoke-test.ts`. It must:

1. GET `{CONTROL_PLANE_URL}/health` → expect 200
2. GET `{CONTROL_PLANE_URL}/api/tenants` → expect 200, body is JSON array
3. GET `{STOREFRONT_URL}/` with `Host: demo-store.{DOMAIN}` header → expect 200 (tests hostname routing)
4. GET `{DEMO_STORE_API_URL}/health` → expect 200

On any failure: print the failed endpoint, status, and body, then `process.exit(1)`.
On success: print a summary and `process.exit(0)`.
Entire script must complete in under 60 seconds.

### Step 3: Create smoke test workflow

Create `.github/workflows/smoke-tests.yml`:
- Trigger: `workflow_call` (called by deploy workflows)
- Inputs: `environment` (staging | production), endpoint URLs
- Run `tsx scripts/smoke/smoke-test.ts`
- On failure in production: run Cloud Run rollback:
  ```bash
  gcloud run services update-traffic tenant-instance \
    --region $REGION --to-revisions=PREVIOUS=100
  ```

### Step 4: Wire into deploy workflows

Add smoke test job to the end of each deploy workflow using `needs:` and `uses: ./.github/workflows/smoke-tests.yml`.

## Constraints

- Smoke tests must not require authentication — only public health endpoints
- Rollback step runs only for `environment: production` input
- Script exits non-zero immediately on first failure — no retries
- Must complete in under 60 seconds
