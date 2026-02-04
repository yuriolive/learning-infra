import { AGENT_MODULE } from "@vendin/agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../route";

describe("Agent API Route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle Direct Format correctly", async () => {
    const processMessageMock = vi.fn().mockResolvedValue("Agent response");
    const { request, response } = createMockRequestResponse({
      body: { phone: "123456", text: "Hello" },
      processMessageMock,
    });

    await POST(request, response);

    expect(request.scope.resolve).toHaveBeenCalledWith(AGENT_MODULE);
    expect(processMessageMock).toHaveBeenCalledWith("123456", "Hello");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ response: "Agent response" });
  });

  it("should handle Meta Webhook Format correctly", async () => {
    const processMessageMock = vi.fn().mockResolvedValue("Agent response");
    const metaBody = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "987654",
                    text: { body: "Meta Hello" },
                    type: "text",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const { request, response } = createMockRequestResponse({
      body: metaBody,
      processMessageMock,
    });

    await POST(request, response);

    expect(processMessageMock).toHaveBeenCalledWith("987654", "Meta Hello");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ response: "Agent response" });
  });

  it("should ignore non-text Meta messages", async () => {
    const metaBody = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "987654",
                    type: "image",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const { request, response } = createMockRequestResponse({
      body: metaBody,
    });

    await POST(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: "ignored_type",
      type: "image",
    });
  });

  it("should fail silently (200 OK) for malformed Meta webhook", async () => {
    const { request, response, loggerMock } = createMockRequestResponse({
      body: { entry: [] },
    });

    await POST(request, response);

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("Received empty or invalid 'entry'"),
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ignored_malformed" }),
    );
  });

  it("should fail silently (200 OK) for missing fields in Direct format", async () => {
    const { request, response, loggerMock } = createMockRequestResponse({
      body: { phone: "123" },
    });

    await POST(request, response);

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("Missing phone or text"),
      expect.any(Object),
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: "ignored_missing_fields",
    });
  });

  it("should return 500 with friendly error if service fails", async () => {
    const processMessageMock = vi
      .fn()
      .mockRejectedValue(new Error("Redis connection failed"));
    const { request, response, loggerMock } = createMockRequestResponse({
      body: { phone: "123456", text: "Hello" },
      processMessageMock,
    });

    await POST(request, response);

    expect(loggerMock.error).toHaveBeenCalledWith(
      "Agent API: Error processing message",
      expect.any(Error),
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "Agent unavailable" });
  });
});

interface LoggerMock {
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
}

const createMockRequestResponse = ({
  body = {},
  processMessageMock,
  loggerMock = { error: vi.fn(), warn: vi.fn() },
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
  processMessageMock?: unknown;
  loggerMock?: LoggerMock;
} = {}) => {
  const request = {
    body,
    headers: {},
    scope: {
      resolve: vi.fn().mockImplementation((key) => {
        if (key === AGENT_MODULE && processMessageMock) {
          return { processMessage: processMessageMock };
        }
        if (key === "logger") {
          return loggerMock;
        }
        return;
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const response = {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return { request, response, loggerMock };
};
