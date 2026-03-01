---
name: implement-agent-tests
description: Implements tests for the LangGraph AI agent including graph routing tests with FakeChatModel, multi-turn conversation flow tests against staging with real Gemini, tenant isolation tests, WhatsApp routing tests, and LangSmith production tracing setup. Use when asked to add agent tests, test LangGraph routing, test AI conversation flows, test tenant isolation, add LangSmith tracing, or test WhatsApp agent routing. Corresponds to tasks T9, T10, T11 in docs/test/IMPLEMENTATION.md.
---

# Implement Agent Tests

Tests for the AI agentic commerce system built on LangGraph + Gemini. Covers three concerns: graph structure correctness (fast, no real LLM), conversation quality (staging, real Gemini), and production observability (LangSmith).

## Project Documentation References

- **[@testing-strategy.md](../../../rules/shared/testing/testing-strategy.md)** - Testing patterns and strategies
- **[STRATEGY.md](../../../../docs/test/STRATEGY.md)** - AI Agent Testing section
- **[IMPLEMENTATION.md](../../../../docs/test/IMPLEMENTATION.md)** - Task T9, T10, T11 prompts and acceptance criteria
- **[ARCHITECTURE.md](../../../../docs/ai-agent/ARCHITECTURE.md)** - Agent architecture overview
- **[TOOLS_REFERENCE.md](../../../../docs/ai-agent/TOOLS_REFERENCE.md)** - Tool definitions and contracts
- **[WHATSAPP_INTEGRATION.md](../../../../docs/ai-agent/WHATSAPP_INTEGRATION.md)** - WhatsApp routing logic

## Context

Vendin is an agentic e-commerce platform. The AI agent is a first-class product feature — it allows customers to shop and merchants to manage their store through natural language via chat or WhatsApp. The agent runs on LangGraph with Gemini, stores conversation state in Redis (keyed by `{tenantId}:{role}:{threadId}`), and calls MedusaJS modules as tools.

## Three Test Types

### T9 — Graph Routing Tests (fast, no real LLM)

**Can start immediately. No staging needed.**

Use `FakeChatModel` from `@langchain/core/utils/testing` — already installed, no new deps.

**Files to read first**:
```
packages/medusa/plugins/ai/agent/src/graph/index.ts
packages/medusa/plugins/ai/agent/src/graph/state.ts
packages/medusa/plugins/ai/agent/src/__tests__/service.spec.ts
```

**Key pattern — inject fake model**:

```typescript
import { FakeChatModel } from "@langchain/core/utils/testing";
import { MemorySaver } from "@langchain/langgraph";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";

// Simulates model returning a tool call
const modelWithToolCall = new FakeChatModel({
  responses: [
    new AIMessage({
      content: "",
      tool_calls: [{ id: "t1", name: "search_products", args: { query: "red shoes" } }],
    }),
  ],
});

// Inject into graph — requires createAgentGraph to accept optional model param
const graph = await createAgentGraph(mockContainer, {
  model: modelWithToolCall,
  checkpointer: new MemorySaver(), // no Redis in tests
});
```

**What to test**:
- Graph routes to `tools` node when model returns a tool call → routes to `__end__` after tool result
- Graph ends at `__end__` when model returns plain text (no tool calls)
- Customer graph does not expose admin tools
- Two different `thread_id` configs produce independent state (no bleed)
- System prompts: customer prompt has no admin content, admin prompt is a superset

**Target**: < 100ms per test. Must pass with `GEMINI_API_KEY` unset.

---

### T10 — Conversation Flow Tests (staging, real Gemini)

**Requires T2 (demo store seeded with products).**

Create at `tests/agent/` in the monorepo root. Separate vitest config with 60s timeout.

**What to test**:

1. **Customer shopping flow** — multi-turn, verifies tool chaining:
   - Turn 1: "Show me products" → assert `search_products` was called
   - Turn 2: "Add the first one to my cart" → assert `get_or_create_cart` + `add_item_to_cart` called

2. **Ambiguous input** — agent asks for clarification, does not hallucinate:
   - "I want the blue one" with no prior context → response asks "Which product?"

3. **Not-found graceful handling**:
   - Request a product SKU that does not exist → helpful error, no invented data

4. **Tenant isolation** (can use MemorySaver — no real Redis needed):
   - Spin two instances with different `tenantId` but same `threadId`
   - Verify messages of tenant A are absent from tenant B's state
   - Verify `search_products` for tenant A returns only tenant A's catalogue

5. **WhatsApp routing** (control-plane):
   - POST mock webhook `to` = demo store phone → routes to tenant with `role=customer`
   - POST mock webhook `to` = Vendin admin number, `from` = registered admin phone → `role=admin`

Add `"test:agent": "vitest run tests/agent --config tests/agent/vitest.config.ts"` to root `package.json`.

---

### T11 — LangSmith Production Tracing

**Can start immediately. No code changes — only config.**

LangGraph auto-instruments when these env vars are present:
- `LANGSMITH_TRACING=true`
- `LANGSMITH_API_KEY=<key>`
- `LANGSMITH_PROJECT=vendin-production`

**Steps**:
1. Add `LANGSMITH_API_KEY` to GCP Secret Manager and reference it in `deploy-tenant-instance.yml`
2. Set `LANGSMITH_TRACING=false` in `.env.example` (opt-in for devs)
3. Create `docs/ai-agent/LANGSMITH.md` — dashboard access, what traces show, how to debug

Do **not** install the `langsmith` npm package — auto-instrumentation via env vars is sufficient.

## Constraints

- T9 must pass with no real API keys (Gemini, Redis) — use mocks and MemorySaver
- T10 tests that call Gemini must run in staging only, never in unit CI
- T11 is config-only — no changes to agent business logic
- Tenant isolation test is the highest-priority test in this skill — a regression here is a data breach
