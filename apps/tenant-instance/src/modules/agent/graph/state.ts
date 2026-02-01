import { Annotation } from "@langchain/langgraph";

import type { BaseMessage } from "@langchain/core/messages";

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),
  cartId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  threadId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});
