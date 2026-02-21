import { HumanMessage } from "@langchain/core/messages";
import { MedusaService } from "@medusajs/framework/utils";

import { createAgentGraph } from "./graph/index.js";
import { getToolsForRole } from "./tools/index.js";

import type { BaseMessage } from "@langchain/core/messages";
import type { MedusaContainer } from "@medusajs/medusa";

class AgentModuleService extends MedusaService({}) {
  protected container: MedusaContainer;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(container: MedusaContainer, options: any) {
    super(container, options);
    this.container = container;
  }

  async processMessage(
    threadId: string,
    text: string,
    context?: { role: "admin" | "customer"; tenantId?: string },
  ): Promise<string> {
    const role = context?.role ?? "customer";
    const tools = getToolsForRole(this.container, role);
    const graph = await createAgentGraph(this.container, {
      tools,
      role,
    });

    const config = {
      configurable: {
        thread_id: threadId,
      },
    };

    const result = await graph.invoke(
      {
        messages: [new HumanMessage(text)],
      },
      config,
    );

    const messages = result.messages as BaseMessage[];
    const lastMessage = messages.at(-1);

    if (!lastMessage) {
      return "No response from agent.";
    }

    if (typeof lastMessage.content === "string") {
      return lastMessage.content;
    }

    return JSON.stringify(lastMessage.content);
  }
}

export default AgentModuleService;
