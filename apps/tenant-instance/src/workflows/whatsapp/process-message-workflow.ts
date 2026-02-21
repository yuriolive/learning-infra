import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  processMessageStep,
  type ProcessMessageStepInput,
} from "./steps/process-message-step";

export const processMessageWorkflow = createWorkflow(
  "process-whatsapp-message-workflow",
  (input: ProcessMessageStepInput) => {
    processMessageStep(input);

    return new WorkflowResponse(undefined);
  },
);
