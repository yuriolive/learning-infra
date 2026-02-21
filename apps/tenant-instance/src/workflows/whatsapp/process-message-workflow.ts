import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  processMessageStep,
  type ProcessMessageStepInput,
} from "./steps/process-message-step";
import { sendReplyStep } from "./steps/send-reply-step";

export const processMessageWorkflow = createWorkflow(
  "process-whatsapp-message-workflow",
  (input: ProcessMessageStepInput) => {
    const response = processMessageStep(input);

    sendReplyStep({
      threadId: input.threadId,
      text: response,
    });

    return new WorkflowResponse(undefined);
  },
);
