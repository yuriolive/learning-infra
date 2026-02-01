import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AGENT_MODULE } from "../../../../modules/agent";
import { POST } from "../route";

describe("Agent API Route", () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnvironment, INTERNAL_API_TOKEN: "test-secret" };
  });

  afterEach(() => {
    process.env = originalEnvironment;
    vi.clearAllMocks();
  });

  it("should return 401 if header is missing or invalid", async () => {
    const loggerMock = { error: vi.fn(), warn: vi.fn() };
    const request = {
      body: {},
      headers: { "x-internal-secret": "wrong-secret" },
      scope: {
        resolve: vi.fn().mockImplementation((key) => {
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

    await POST(request, response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("should handle Direct Format correctly", async () => {
    const processMessageMock = vi.fn().mockResolvedValue("Agent response");
    const loggerMock = { error: vi.fn(), warn: vi.fn() };
    const request = {
      body: { phone: "123456", text: "Hello" },
      headers: { "x-internal-secret": "test-secret" },
      scope: {
        resolve: vi.fn().mockImplementation((key) => {
          if (key === AGENT_MODULE) {
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

    await POST(request, response);

    expect(request.scope.resolve).toHaveBeenCalledWith(AGENT_MODULE);
    expect(processMessageMock).toHaveBeenCalledWith("123456", "Hello");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ response: "Agent response" });
  });

  it("should handle Meta Webhook Format correctly", async () => {
    const processMessageMock = vi.fn().mockResolvedValue("Agent response");
    const loggerMock = { error: vi.fn(), warn: vi.fn() };
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

    const request = {
      body: metaBody,
      headers: { "x-internal-secret": "test-secret" },
      scope: {
        resolve: vi.fn().mockImplementation((key) => {
          if (key === AGENT_MODULE) {
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

    await POST(request, response);

    expect(processMessageMock).toHaveBeenCalledWith("987654", "Meta Hello");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ response: "Agent response" });
  });

  it("should ignore non-text Meta messages", async () => {
    const loggerMock = { error: vi.fn(), warn: vi.fn() };
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

    const request = {
      body: metaBody,
      headers: { "x-internal-secret": "test-secret" },
      scope: {
        resolve: vi.fn().mockImplementation((key) => {
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

    await POST(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: "ignored_type",
      type: "image",
    });
  });

  it("should fail silently (200 OK) for malformed Meta webhook", async () => {
    const loggerMock = { error: vi.fn(), warn: vi.fn() };
    const request = {
      body: { entry: [] }, // Empty entry
      headers: { "x-internal-secret": "test-secret" },
      scope: {
        resolve: vi.fn().mockImplementation((key) => {
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

    await POST(request, response);

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("Received empty or invalid 'entry'"),
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ status: "ignored_malformed" });
  });

  it("should fail silently (200 OK) for missing fields in Direct format", async () => {
    const loggerMock = { error: vi.fn(), warn: vi.fn() };
    const request = {
      body: { phone: "123" }, // Missing text
      headers: { "x-internal-secret": "test-secret" },
      scope: {
        resolve: vi.fn().mockImplementation((key) => {
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
    const loggerMock = { error: vi.fn(), warn: vi.fn() };
    const request = {
      body: { phone: "123456", text: "Hello" },
      headers: { "x-internal-secret": "test-secret" },
      scope: {
        resolve: vi.fn().mockImplementation((key) => {
          if (key === AGENT_MODULE) {
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

    await POST(request, response);

    expect(loggerMock.error).toHaveBeenCalledWith(
      "Agent API: Error processing message",
      expect.any(Error),
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "Agent unavailable" });
  });
});
