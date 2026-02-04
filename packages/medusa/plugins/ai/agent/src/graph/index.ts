import { SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph } from "@langchain/langgraph";
import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";

import { getCartTools } from "../tools/cart.js";
import { getStoreTools } from "../tools/products.js";

import { AgentState } from "./state.js";

import type { MedusaContainer } from "@medusajs/medusa";

// Singleton implementation for Redis Checkpointer
let checkpointer: RedisSaver | undefined;

async function getCheckpointer() {
  if (checkpointer) {
    return checkpointer;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  // RedisSaver.fromUrl handles client creation and connection using 'redis' package
  checkpointer = await RedisSaver.fromUrl(redisUrl);
  return checkpointer;
}

export async function createAgentGraph(container: MedusaContainer) {
  // 1. Initialize Model
  const model = new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL || "gemini-3.0-flash",
    apiKey: process.env.GEMINI_API_KEY || "",
  });

  // 2. Initialize Tools
  const storeTools = getStoreTools(container);
  const cartTools = getCartTools(container);
  const tools = [...storeTools, ...cartTools];

  // 3. Bind Tools to Model
  const modelWithTools = model.bindTools(tools);

  // 4. Define Nodes

  // Agent Node
  async function agentNode(state: typeof AgentState.State) {
    const { messages } = state;

    // System Prompt
    const systemMessage = new SystemMessage(
      `You are a friendly sales assistant for a store. You have access to products and the user's cart.
1. ALWAYS use search_products if the user asks for an item.
2. If the user wants to buy, use get_or_create_cart then add_item_to_cart.
3. Keep responses short and WhatsApp-friendly format.`,
    );

    // Prepend system message to history
    const messagesWithSystem = [systemMessage, ...messages];

    const response = await modelWithTools.invoke(messagesWithSystem);

    return { messages: [response] };
  }

  // Tools Node
  const toolNode = new ToolNode(tools);

  // 5. Build Graph
  const workflow = new StateGraph(AgentState)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", toolsCondition)
    .addEdge("tools", "agent");

  // 6. Compile with Checkpointer
  const saver = await getCheckpointer();

  return workflow.compile({ checkpointer: saver });
}
