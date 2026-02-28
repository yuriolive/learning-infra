# Test & Deployment Strategy

**Status**: In Planning
**Scope**: Full platform — all apps and services

## Problem

The current CI pipeline goes directly from unit tests to production:

```
lint → typecheck → build → test (unit) → deploy
```

There is no environment where integrated, cross-service behavior is verified against real running infrastructure before code reaches users. This is the primary risk.

## Target Pipeline

```
lint → typecheck → build → unit tests
                               ↓
                    integration tests (Testcontainers)
                               ↓
                    Cloudflare preview deploy (CF apps)  ←── per PR, free
                    staging Cloud Run deploy (tenant-instance)
                               ↓
                    smoke tests vs. preview + staging
                    E2E tests (Playwright)
                    ephemeral provisioning test (nightly)
                               ↓
                    deploy to production
                               ↓
                    post-deploy smoke tests
```

Production deploys are **gated** on preview/staging validation passing.

---

## Test Layers

### Layer 1 — Unit Tests (current, keep)

Fast, isolated, no infrastructure. See [CURRENT_STATE.md](./CURRENT_STATE.md) and [PLANNED_IMPROVEMENTS.md](./PLANNED_IMPROVEMENTS.md) for current implementation and Phase 2 refactoring plan.

**Target**: < 10ms per test, < 30s total suite.

### Layer 2 — Integration Tests (expand)

Test real behaviour against a real database without external services.

Currently using **PGLite** (in-memory PostgreSQL). This is correct for control-plane repository and service tests. For tests that need persistent connections or extensions not supported by PGLite, **Testcontainers** (`@testcontainers/postgresql`) can spin up a real isolated PostgreSQL instance per suite.

**What to cover**:

- All control-plane API routes (tenant CRUD, proxy auth, activation)
- Storefront hostname → tenant resolution
- Cache layer (hit/miss/expiry under real Redis via Testcontainers)
- Auth token validation flows

**Target**: < 5s per test, < 5 min total.

### Layer 3 — E2E Tests (new, Playwright)

Run against the **persistent demo store** in staging after each staging deploy. Cover critical user paths end-to-end through real Cloudflare Workers and Cloud Run.

**Flows to cover**:

1. Merchant signup on marketing site
2. Merchant login and dashboard access
3. Product creation via merchant UI
4. Customer browsing storefront (hostname routing → tenant-instance proxy)
5. Customer checkout flow

**Target**: < 15 min total, runs after staging deploy only.

### Layer 4 — Provisioning Tests (new, nightly)

Test the full tenant lifecycle against real staging infrastructure. Slow by nature — not suited to every PR.

**Flows to cover**:

1. Provision a new tenant (control-plane API → GCP Workflow → Neon DB → Cloud Run)
2. Verify the provisioned tenant responds correctly (health check + store API)
3. Trigger a provisioning failure and verify rollback cleans up all resources
4. Deprovision (delete tenant) and verify complete cleanup

**Schedule**: Nightly on a cron job, not on every PR.

**Target**: < 10 min per full lifecycle, must clean up even on failure.

### Layer 5 — Contract Tests (future)

The `storefront ↔ control-plane ↔ tenant-instance` boundary is the most likely source of silent breakage when interfaces change. Contract tests (Pact or equivalent) run in CI, before integration tests, to catch interface drift early.

---

## AI Agent Testing

Vendin is an **agentic e-commerce platform** — the AI agent is a first-class product feature, not a side experiment. This means agent correctness, conversation quality, and multi-tenant isolation need the same rigour as the infrastructure tests above.

The agent stack: **LangGraph + Gemini + Redis conversation memory + MedusaJS tool integrations** (product search, cart, orders, inventory).

### Agent Test Layers

#### A — Graph Routing Tests (fast, no real LLM)

Use `FakeChatModel` from `@langchain/core/utils/testing` to inject a mock LLM into the graph. This lets you verify the graph's routing logic — does `toolsCondition` call the tools node when the model returns a tool call? Does it end correctly when there are no tool calls? — without hitting Gemini or costing tokens.

**What to cover**:

- Graph routes to `tools` node when model returns a tool call
- Graph ends at `__end__` when model returns a plain message
- Customer role only gets customer tools bound
- Admin role gets all tools bound
- Conversation history accumulates correctly across turns (state merging)

**Can start immediately — no staging needed.**
**Target**: < 100ms per test, runs in CI on every PR.

#### B — Tool Integration Tests (expand existing)

The tools tests already exist and mock the MedusaJS container. Expand coverage to include:

- `search_products` with multiple currencies and empty results
- `add_item_to_cart` when variant has no price in the region (should return error message, not throw)
- Multi-tool sequences: search → get cart → add item (agent calls tools in order)
- Admin tools (Phase 2): product CRUD, inventory update, order fulfillment

**Can start immediately.**
**Target**: < 500ms per test.

#### C — Conversation Flow Tests (staging, real Gemini)

Multi-turn conversation tests run against the demo store in staging using the real Gemini model. These verify that the agent actually understands intent and calls the right tools — something a mock LLM cannot validate.

**Flows to cover**:

1. **Customer shopping flow**: "Show me running shoes under $100" → "Add the first one in size M" → "What's in my cart?"
2. **Admin inventory flow** (Phase 2): "Check stock for SKU-RED-M" → "Update it to 50 units"
3. **WhatsApp customer flow**: Webhook arrives with customer phone → agent responds via WhatsApp provider
4. **WhatsApp admin flow**: Webhook arrives on Vendin's admin number → admin tools available
5. **Ambiguous input handling**: Agent asks for clarification rather than guessing wrong tool

**Runs after staging deploy, same wave as Playwright E2E.**
**Target**: < 5 min for full conversation suite.

#### D — Tenant Isolation Tests (critical)

The Redis conversation memory is keyed by `{tenantId}:{role}:{threadId}`. A bug in key construction could leak one merchant's conversation state into another's — a serious data isolation failure.

**What to cover**:

- Two concurrent conversations on different tenants with the same thread ID → zero state bleed
- Customer role cannot invoke admin tools even if the Redis state is manipulated
- Tool calls operate on the correct tenant's Neon DB (product search returns only that tenant's catalogue)

**Runs nightly alongside provisioning tests.**

#### E — LangSmith Production Tracing (observability, not a gate)

Enable LangSmith tracing in production with a single environment variable. This provides:

- Full trace of every LLM call, tool invocation, and token usage
- Latency breakdown per graph node
- A dashboard to inspect and debug production agent failures without code changes

**Setup**: `LANGSMITH_TRACING=true` + `LANGSMITH_API_KEY` in production secrets. No code changes needed — LangGraph auto-instruments when the env var is set.

**Not a CI gate** — purely operational. Set up when the agent goes to production.

### Tool Choice Rationale

| Need                             | Tool                                           | Why                                              |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Graph routing tests              | `FakeChatModel` (already in `@langchain/core`) | Zero cost, deterministic, no API key needed      |
| Tool unit tests                  | Vitest + `vi.fn()` mocks                       | Already established pattern                      |
| Conversation quality in staging  | Real Gemini (`GEMINI_API_KEY`)                 | Can't validate intent understanding with mocks   |
| Production observability         | LangSmith                                      | Official LangGraph integration, minimal setup    |
| Prompt A/B testing               | PromptFoo (future)                             | Only relevant once you're optimising prompts     |
| Model comparison across versions | Braintrust (future)                            | Worth revisiting when you have 5+ agent variants |

---

## Demo Store

Two stores serve different purposes in the strategy:

### Persistent Demo Store

Provisioned once in staging. Always running. Pre-seeded with realistic data:

- Product catalog (categories, collections, variants, images)
- Sample customer accounts
- Historical orders in various states

**Purpose**:

- Target for smoke tests after every staging deploy
- Target for Playwright E2E tests
- Reset via `pnpm db:seed:demo` if state is corrupted by tests
- Optionally exposed publicly as a prospect-facing showcase

### Ephemeral Store (per provisioning test run)

Created fresh during the nightly provisioning test to exercise the full provisioning path. Torn down completely after the test — Cloud Run revision deleted, Neon DB dropped, DNS cleared.

**Purpose**:

- Verifies the exact experience a new paying merchant receives
- Tests the GCP Workflow happy path and rollback path
- Validates cleanup/deprovision logic

| Concern                | Persistent demo | Ephemeral |
| ---------------------- | --------------- | --------- |
| Storefront routing     | ✅              | ✅        |
| Merchant dashboard     | ✅              | ✅        |
| Product / order APIs   | ✅              | —         |
| Full provisioning flow | —               | ✅        |
| Rollback on failure    | —               | ✅        |
| Resource cleanup       | —               | ✅        |

---

## Cloudflare Preview Builds

Cloudflare Pages and Workers both support **preview deployments** — each PR automatically gets a unique preview URL (`<hash>.vendin.pages.dev` for Pages, or a preview Worker URL). This is a significant advantage that changes the staging story for CF-deployed apps.

**What this means for the pipeline**:

- **marketing, storefront, control-plane**: No separate staging environment needed. Every PR already gets an isolated preview deployment that can be targeted for smoke tests and E2E tests before merge.
- **tenant-instance** (Cloud Run): Still needs a shared staging Cloud Run instance, since GCP doesn't have an equivalent per-PR preview mechanism.

**How to wire it together**:

1. Cloudflare preview URL is output from the deploy step (available as a CI env var or via Wrangler output).
2. Playwright E2E tests receive the preview URL as a base URL and run against it.
3. The preview control-plane is configured to talk to the **staging** Cloud Run instance (not production).
4. On merge to main, production deploy proceeds only if the preview tests passed.

**Benefits**:

- Zero cost for additional staging infra (preview deploys are included in Cloudflare plan)
- True per-PR isolation — no shared staging state between concurrent PRs
- Preview URLs persist until the branch is deleted, allowing manual QA

**Constraint**: Preview deploys share the same Cloudflare bindings (D1, KV, etc.) unless explicitly configured with preview-specific binding IDs in `wrangler.jsonc`. Ensure D1 preview databases are separate from production.

---

## Deployment Guarantees

### Pre-deploy (already in place)

- DB migrations run before code deploys
- Lint, type-check, and build must pass

### Staging gate (new)

- All Layer 2–3 tests must pass against staging before production is unblocked
- Staging deploy mirrors production infra: separate Cloudflare zones, separate Cloud Run project, separate Neon project

### Post-deploy smoke tests (new)

After each production deploy, automatically verify:

- Health check endpoints respond correctly
- Critical API routes return expected shapes
- Storefront resolves the demo store hostname

If post-deploy smoke fails → trigger Cloud Run revision rollback (traffic shift back to previous revision). Cloudflare Workers support instant rollback via Wrangler.

### Cloud Run traffic splitting (new)

For tenant-instance deploys: route 10% of traffic to the new revision, check error rates for 5 minutes, then promote to 100% or rollback automatically.

---

## Implementation Priority

1. **Staging environment** — all other layers depend on it
2. **Persistent demo store in staging** — needed for smoke tests and E2E
3. **Testcontainers for integration tests** — expands coverage beyond PGLite limits
4. **Agent graph routing tests** — fast, no staging dependency, high value
5. **Playwright E2E for critical flows** — highest confidence signal
6. **Agent conversation flow tests in staging** — validates real LLM behaviour
7. **Post-deploy smoke tests** — fast production safety net
8. **Ephemeral provisioning tests + tenant isolation tests** (nightly) — validates full lifecycle
9. **LangSmith tracing** — enable when agent goes to production
10. **Contract tests** — prevents slow interface drift between services

---

## Related Documents

- [CURRENT_STATE.md](./CURRENT_STATE.md) — Phase 1 implementation detail
- [PLANNED_IMPROVEMENTS.md](./PLANNED_IMPROVEMENTS.md) — Phase 2 refactoring plan (unit/integration/API separation)
- [GCP Infrastructure Setup](../setup/GCP_INFRASTRUCTURE_SETUP.md)
- [Tenant Provisioning Setup](../setup/TENANT_PROVISIONING_SETUP.md)
- [Control Plane Deployment](../deployment/CONTROL_PLANE.md)
