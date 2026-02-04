import { HumanMessage } from "@langchain/core/messages";
import { MedusaService } from "@medusajs/framework/utils";

import { createAgentGraph } from "./graph";

import type { BaseMessage } from "@langchain/core/messages";
import type { MedusaContainer } from "@medusajs/medusa";

const Base = MedusaService({});

class AgentModuleService extends Base {
  protected container: MedusaContainer;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(container: MedusaContainer, options: any) {
    super(container, options);
    this.container = container;
  }

  async processMessage(phone: string, text: string): Promise<string> {
    const graph = await createAgentGraph(this.container);

    const config = {
      configurable: {
        thread_id: phone,
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
