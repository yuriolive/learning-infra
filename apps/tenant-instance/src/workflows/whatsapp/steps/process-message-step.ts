import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { AGENT_MODULE, type AgentModuleService } from "@vendin/medusa-ai-agent";

export interface ProcessMessageStepInput {
  threadId: string;
  text: string;
}

export const processMessageStep = createStep(
  "process-whatsapp-message",
  async (input: ProcessMessageStepInput, { container }) => {
    const agentService = container.resolve<AgentModuleService>(AGENT_MODULE);

    const response = await agentService.processMessage(
      input.threadId,
      input.text,
      {
        role: "customer",
      },
    );

    return new StepResponse(response);
  },
);
