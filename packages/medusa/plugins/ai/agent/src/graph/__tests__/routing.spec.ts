import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { getToolsForRole } from "../../tools/index.js";
import { createAgentGraph } from "../index.js";

import type { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import type { BaseMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
import type { MedusaContainer } from "@medusajs/medusa";

// ---------------------------------------------------------------------------
// Minimal sequential fake model
// ---------------------------------------------------------------------------
// FakeStreamingChatModel does not cycle through responses — it always returns
// responses[0]. We need a model that cycles AND supports bindTools for
// LangGraph's ToolNode integration.
class FakeSequentialChatModel extends BaseChatModel {
  private readonly _responses: AIMessage[];
  private _callCount = 0;

  constructor(responses: AIMessage[]) {
    super({});
    this._responses = responses;
  }

  _llmType(): string {
    return "fake-sequential";
  }

  async _generate(
    _messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    // Length is always > 0 because the constructor requires a non-empty array.

    const response = this._responses[this._callCount % this._responses.length]!;
    this._callCount++;
    const text = typeof response.content === "string" ? response.content : "";
    return {
      generations: [{ text, message: response }],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override bindTools(_tools: any[]): this {
    // Return self — tools are passed as invocation config but we return
    // the predefined sequence regardless.
    return this;
  }
}

// ---------------------------------------------------------------------------
// Shared test infrastructure
// ---------------------------------------------------------------------------

/** A minimal fake tool that the ToolNode can actually execute. */
const fakeSearchTool = tool(async () => "[]", {
  name: "search_products",
  description: "Search for products",
  schema: z.object({ query: z.string() }),
});

const fakeCartTool = tool(async () => "cart_test", {
  name: "get_or_create_cart",
  description: "Get or create a cart",
  schema: z.object({ customer_id: z.string() }),
});

const fakeAddItemTool = tool(async () => "Item added to cart successfully.", {
  name: "add_item_to_cart",
  description: "Add item to cart",
  schema: z.object({
    cart_id: z.string(),
    variant_id: z.string(),
    quantity: z.number(),
  }),
});

const customerFakeTools = [fakeSearchTool, fakeCartTool, fakeAddItemTool];

/** Minimal mock container — tools under test require a container, but routing
 *  tests use fake tools that don't touch the container. */
const mockContainer = {} as unknown as MedusaContainer;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Graph Routing", () => {
  it("routes to tools node when model returns a tool call", async () => {
    const responses = [
      // Turn 1: model requests a tool call
      new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "search_products",
            args: { query: "shoes" },
            id: "call_1",
            type: "tool_call",
          },
        ],
      }),
      // Turn 2: model returns plain text after seeing the tool result
      new AIMessage({ content: "Here are the shoes I found." }),
    ];

    const graph = await createAgentGraph(mockContainer, {
      tools: customerFakeTools,
      role: "customer",
      model: new FakeSequentialChatModel(responses),
      checkpointer: new MemorySaver(),
    });

    const result = await graph.invoke(
      { messages: [new HumanMessage("Show me some shoes")] },
      { configurable: { thread_id: "routing-tool-call" } },
    );

    // The graph should have routed through the tools node:
    // a ToolMessage will appear between the AIMessage tool call and the final reply.
    const toolMessages = result.messages.filter(
      (m: { _getType: () => string }) => m._getType() === "tool",
    );
    expect(toolMessages.length).toBeGreaterThan(0);
    expect(result.messages.at(-1)!.content).toBe("Here are the shoes I found.");
  });

  it("ends at __end__ when model returns a plain text message (no tool calls)", async () => {
    const graph = await createAgentGraph(mockContainer, {
      tools: customerFakeTools,
      role: "customer",
      model: new FakeSequentialChatModel([
        new AIMessage({ content: "Hello! How can I help you?" }),
      ]),
      checkpointer: new MemorySaver(),
    });

    const result = await graph.invoke(
      { messages: [new HumanMessage("Hi")] },
      { configurable: { thread_id: "routing-plain-text" } },
    );

    const toolMessages = result.messages.filter(
      (m: { _getType: () => string }) => m._getType() === "tool",
    );
    expect(toolMessages).toHaveLength(0);
    expect(result.messages.at(-1)!.content).toBe("Hello! How can I help you?");
  });

  it("customer role has only customer tools (search_products, get_or_create_cart, add_item_to_cart)", () => {
    // Admin tools are Phase 2 (currently returns []).
    // Customer role should get store + cart tools.
    const mockContainerWithModules = {
      resolve: () => ({
        listAndCountProducts: async () => [[], 0],
        listCarts: async () => [],
        createCarts: async () => ({ id: "cart_new" }),
        listAndCountRegions: async () => [
          [{ id: "reg_1", currency_code: "brl" }],
          1,
        ],
        retrieveCustomer: async () => ({ email: "test@test.com" }),
        listAndCountProductVariants: async () => [[], 0],
        retrieveCart: async () => ({
          id: "cart_1",
          region_id: "reg_1",
          currency_code: "brl",
        }),
        calculatePrices: async () => [],
        addLineItems: async () => ({ id: "cart_1" }),
      }),
    } as unknown as MedusaContainer;

    const customerTools = getToolsForRole(mockContainerWithModules, "customer");
    const toolNames = customerTools.map((t: { name: string }) => t.name);

    expect(toolNames).toContain("search_products");
    expect(toolNames).toContain("get_or_create_cart");
    expect(toolNames).toContain("add_item_to_cart");

    // Admin tools are Phase 2 — not present in customer role
    const adminTools = getToolsForRole(mockContainerWithModules, "admin");
    const adminToolNames = adminTools.map((t: { name: string }) => t.name);
    for (const name of adminToolNames) {
      expect(toolNames).not.toContain(name);
    }
  });

  it("accumulates messages correctly across two turns", async () => {
    const checkpointer = new MemorySaver();
    const graph = await createAgentGraph(mockContainer, {
      tools: customerFakeTools,
      role: "customer",
      model: new FakeSequentialChatModel([
        new AIMessage({ content: "First reply" }),
        new AIMessage({ content: "Second reply" }),
      ]),
      checkpointer,
    });

    const threadId = "accumulate-turns";

    await graph.invoke(
      { messages: [new HumanMessage("First message")] },
      { configurable: { thread_id: threadId } },
    );

    await graph.invoke(
      { messages: [new HumanMessage("Second message")] },
      { configurable: { thread_id: threadId } },
    );

    const state = await graph.getState({
      configurable: { thread_id: threadId },
    });
    const contents = state.values.messages.map(
      (m: { content: unknown }) => m.content,
    );

    expect(contents).toContain("First message");
    expect(contents).toContain("Second message");
    expect(contents).toContain("First reply");
    expect(contents).toContain("Second reply");
  });

  it("two different thread IDs do not share messages", async () => {
    const checkpointer = new MemorySaver();

    const graphA = await createAgentGraph(mockContainer, {
      tools: customerFakeTools,
      role: "customer",
      model: new FakeSequentialChatModel([
        new AIMessage({ content: "Response for A" }),
      ]),
      checkpointer,
    });

    const graphB = await createAgentGraph(mockContainer, {
      tools: customerFakeTools,
      role: "customer",
      model: new FakeSequentialChatModel([
        new AIMessage({ content: "Response for B" }),
      ]),
      checkpointer,
    });

    await graphA.invoke(
      { messages: [new HumanMessage("Hello from thread A")] },
      { configurable: { thread_id: "isolation-thread-A" } },
    );

    await graphB.invoke(
      { messages: [new HumanMessage("Hello from thread B")] },
      { configurable: { thread_id: "isolation-thread-B" } },
    );

    const stateA = await graphA.getState({
      configurable: { thread_id: "isolation-thread-A" },
    });
    const stateB = await graphB.getState({
      configurable: { thread_id: "isolation-thread-B" },
    });

    const contentsA = stateA.values.messages.map(
      (m: { content: unknown }) => m.content,
    );
    const contentsB = stateB.values.messages.map(
      (m: { content: unknown }) => m.content,
    );

    expect(contentsA).not.toContain("Hello from thread B");
    expect(contentsB).not.toContain("Hello from thread A");
  });
});
