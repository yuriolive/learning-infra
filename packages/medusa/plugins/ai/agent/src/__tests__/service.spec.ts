import { describe, it, expect, vi, beforeEach } from "vitest";
import AgentModuleService from "../service.js";
import { HumanMessage } from "@langchain/core/messages";

// Mock graph creation properly
const { mockGraphInvoke } = vi.hoisted(() => ({
  mockGraphInvoke: vi.fn(),
}));

vi.mock("../graph/index.js", () => ({
  createAgentGraph: vi.fn().mockResolvedValue({
    invoke: mockGraphInvoke,
  }),
}));

describe("AgentModuleService", () => {
  let service: AgentModuleService;
  let containerMock: any;

  beforeEach(() => {
    containerMock = {};
    service = new AgentModuleService(containerMock, {});
    mockGraphInvoke.mockReset();
  });

  it("should process message and return response", async () => {
    mockGraphInvoke.mockResolvedValue({
      messages: [new HumanMessage("Hello"), { content: "Hi there" }],
    });

    const result = await service.processMessage("123", "Hello");

    expect(mockGraphInvoke).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([expect.any(HumanMessage)]),
      }),
      { configurable: { thread_id: "123" } }
    );
    expect(result).toBe("Hi there");
  });

  it("should handle complex content", async () => {
    mockGraphInvoke.mockResolvedValue({
      messages: [{ content: { text: "Complex" } }],
    });

    const result = await service.processMessage("123", "Hello");
    expect(result).toBe('{"text":"Complex"}');
  });

  it("should handle no response", async () => {
    mockGraphInvoke.mockResolvedValue({
      messages: [],
    });

    const result = await service.processMessage("123", "Hello");
    expect(result).toBe("No response from agent.");
  });
});
