import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph } from "@langchain/langgraph";
import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";

import { getAdminSystemPrompt } from "./prompts/admin.js";
import { getCustomerSystemPrompt } from "./prompts/customer.js";
import { AgentState } from "./state.js";

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import type { MedusaContainer } from "@medusajs/medusa";

// Singleton implementation for Redis Checkpointer
let checkpointerPromise: Promise<RedisSaver> | undefined;

function getCheckpointer() {
  if (checkpointerPromise) {
    return checkpointerPromise;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  // RedisSaver.fromUrl handles client creation and connection using 'redis' package
  checkpointerPromise = RedisSaver.fromUrl(redisUrl).catch((error) => {
    checkpointerPromise = undefined;
    throw error;
  });

  return checkpointerPromise;
}

export async function createAgentGraph(
  container: MedusaContainer,
  options: {
    tools: StructuredToolInterface[];
    role: "admin" | "customer";
    /** Optional model override — inject a test double (e.g. FakeChatModel) instead of Gemini. */
    model?: BaseChatModel;
    /** Optional checkpointer override — inject MemorySaver in tests instead of RedisSaver. */
    checkpointer?: BaseCheckpointSaver;
  },
) {
  // 1. Initialize Model
  const model =
    options.model ??
    new ChatGoogleGenerativeAI({
      model: process.env.GEMINI_MODEL || "gemini-3.0-flash",
      apiKey: process.env.GEMINI_API_KEY || "",
    });

  // 2. Bind Tools to Model
  if (!model.bindTools) {
    throw new Error(
      "The provided model does not support tool binding. Use a model that implements bindTools (e.g. ChatGoogleGenerativeAI).",
    );
  }
  const modelWithTools = model.bindTools(options.tools);

  // 3. Define Nodes

  // Agent Node
  async function agentNode(state: typeof AgentState.State) {
    const { messages } = state;

    // System Prompt
    const systemMessage =
      options.role === "admin"
        ? getAdminSystemPrompt()
        : getCustomerSystemPrompt();

    // Prepend system message to history
    const messagesWithSystem = [systemMessage, ...messages];

    const response = await modelWithTools.invoke(messagesWithSystem);

    return { messages: [response] };
  }

  // Tools Node
  const toolNode = new ToolNode(options.tools);

  // 4. Build Graph
  const workflow = new StateGraph(AgentState)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", toolsCondition)
    .addEdge("tools", "agent");

  // 5. Compile with Checkpointer
  const saver = options.checkpointer ?? (await getCheckpointer());

  return workflow.compile({ checkpointer: saver });
}
