---
name: implement-e2e-tests
description: Creates Playwright end-to-end tests for the merchant signup, merchant dashboard, storefront browsing, and customer checkout flows. Tests run against the persistent demo store in staging. Use when asked to add Playwright tests, write E2E tests, test merchant signup, test storefront flow, or test checkout. Corresponds to task T5 in docs/test/IMPLEMENTATION.md. Requires T4 (smoke tests) to be complete first.
---

# Implement E2E Tests

Creates Playwright end-to-end tests covering the four critical user paths of the platform. Tests run against the persistent demo store in the staging environment.

## Project Documentation References

- **[@testing-strategy.md](../../../rules/shared/testing/testing-strategy.md)** - Testing patterns and strategies
- **[@frontend-development.md](../../../rules/apps/storefront/frontend-development.md)** - Storefront patterns
- **[STRATEGY.md](../../../../docs/test/STRATEGY.md)** - Layer 3 section
- **[IMPLEMENTATION.md](../../../../docs/test/IMPLEMENTATION.md)** - Task T5 prompt and acceptance criteria
- **[DEMO_STORE.md](../../../../docs/test/DEMO_STORE.md)** - Demo store credentials and URLs

## Prerequisites

- T4 (smoke tests) must be passing — confirms staging is healthy before writing E2E
- Demo store credentials available as environment variables (`DEMO_STORE_URL`, `DEMO_MERCHANT_EMAIL`, etc.)

## Workflow

### Step 1: Read existing structure

```
apps/marketing/src/app/          # Sign-up flow pages
apps/storefront/src/             # Storefront pages and routing
docs/test/DEMO_STORE.md          # Credentials and URLs
```

### Step 2: Install Playwright

```bash
pnpm add -D @playwright/test -w
pnpm exec playwright install chromium
```

### Step 3: Create root E2E config

Create `tests/e2e/playwright.config.ts`:
- `baseURL` from `E2E_BASE_URL` env var
- 2 workers, `retries: 1` in CI, `retries: 0` locally
- HTML reporter, artifacts on failure

### Step 4: Write test files

| File | Flow |
|---|---|
| `tests/e2e/merchant/signup.spec.ts` | Merchant signup on marketing site |
| `tests/e2e/merchant/dashboard.spec.ts` | Login + create a product |
| `tests/e2e/storefront/browse.spec.ts` | Customer browses demo store (hostname routing) |
| `tests/e2e/storefront/checkout.spec.ts` | Customer add-to-cart + checkout |

### Step 5: Add root script and CI job

Add `"test:e2e": "playwright test --config tests/e2e/playwright.config.ts"` to root `package.json`.

Update `.github/workflows/deploy-staging.yml` to run `pnpm test:e2e` after staging deploy succeeds. Upload test report as a workflow artifact.

## Constraints

- All E2E tests live in `tests/e2e/` at the monorepo root — not inside individual apps
- Credentials come from environment variables only — never hardcoded
- Tests must clean up data they create (delete test orders, etc.)
- Each spec file must be runnable independently: `playwright test tests/e2e/merchant/signup.spec.ts`
- Full suite must complete under 15 minutes
