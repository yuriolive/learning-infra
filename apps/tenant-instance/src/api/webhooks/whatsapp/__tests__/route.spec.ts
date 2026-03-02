import crypto from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "../route";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { Logger } from "@medusajs/framework/types";

vi.mock("../../../workflows/whatsapp/process-message-workflow", () => {
  return {
    processMessageWorkflow: vi.fn().mockImplementation(() => {
      return {
        run: vi.fn().mockResolvedValue({}),
      };
    }),
  };
});

// Since the workflow relies on `processMessageStep` we need to mock it as well to avoid
// awilix dependency injection error on AGENT_MODULE, we mock the whole framework
vi.mock("@medusajs/framework/workflows-sdk", () => {
  return {
    createStep: vi.fn().mockReturnValue(vi.fn()),
    createWorkflow: vi
      .fn()
      .mockReturnValue(
        vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) }),
      ),
    StepResponse: vi.fn(),
    WorkflowResponse: vi.fn(),
  };
});

describe("WhatsApp Webhook Route", () => {
  let mockRequest: Partial<MedusaRequest> & { rawBody?: string };
  let mockResponse: Partial<MedusaResponse>;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    } as unknown as Logger;

    mockRequest = {
      body: {},
      headers: {},
      query: {},
      rawBody: "raw_body_content",
      scope: {
        resolve: vi.fn().mockImplementation((key) => {
          if (key === "logger") return mockLogger;
          return {};
        }),
      } as any,
    };

    mockResponse = {
      json: vi.fn(),
      send: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as unknown as Partial<MedusaResponse>;
  });

  describe("GET handler", () => {
    it("should respond with challenge when token matches", () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "valid_token";

      mockRequest.query = {
        "hub.challenge": "12345",
        "hub.mode": "subscribe",
        "hub.verify_token": "valid_token",
      };

      GET(mockRequest as MedusaRequest, mockResponse as MedusaResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith("12345");
    });

    it("should respond with 403 when token does not match", () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "valid_token";

      mockRequest.query = {
        "hub.challenge": "12345",
        "hub.mode": "subscribe",
        "hub.verify_token": "invalid_token",
      };

      GET(mockRequest as MedusaRequest, mockResponse as MedusaResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.send).toHaveBeenCalledWith("Forbidden");
    });
  });

  describe("POST handler", () => {
    const validSecret = "test_secret";

    beforeEach(() => {
      process.env.WHATSAPP_APP_SECRET = validSecret;
    });

    it("should return 500 if WHATSAPP_APP_SECRET is not configured", async () => {
      delete process.env.WHATSAPP_APP_SECRET;

      await POST(mockRequest as MedusaRequest, mockResponse as MedusaResponse);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "WHATSAPP_APP_SECRET is not configured",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Server configuration error",
      });
    });

    it("should return 401 if missing signature", async () => {
      await POST(mockRequest as MedusaRequest, mockResponse as MedusaResponse);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Missing WhatsApp webhook signature",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.send).toHaveBeenCalledWith("Unauthorized");
    });

    it("should return 500 if rawBody is missing", async () => {
      if (mockRequest.headers)
        mockRequest.headers["x-hub-signature-256"] = "some_signature";
      delete mockRequest.rawBody;

      await POST(mockRequest as MedusaRequest, mockResponse as MedusaResponse);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Raw request body is missing, cannot verify signature",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Server configuration error",
      });
    });

    it("should return 401 if signature is invalid", async () => {
      if (mockRequest.headers)
        mockRequest.headers["x-hub-signature-256"] = "sha256=invalid_signature";

      await POST(mockRequest as MedusaRequest, mockResponse as MedusaResponse);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Invalid WhatsApp webhook signature",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.send).toHaveBeenCalledWith("Unauthorized");
    });

    it("should process valid payload and return 200 OK", async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  contacts: [{ profile: { name: "Test User" }, wa_id: "789" }],
                  messages: [
                    {
                      from: "789",
                      id: "msg_id",
                      text: { body: "Hello World" },
                      timestamp: "1234567890",
                      type: "text",
                    },
                  ],
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "123",
                    phone_number_id: "456",
                  },
                },
              },
            ],
            id: "entry_id",
          },
        ],
        object: "whatsapp_business_account",
      };

      mockRequest.body = payload;
      mockRequest.rawBody = JSON.stringify(payload);

      const hash = crypto
        .createHmac("sha256", validSecret)
        .update(mockRequest.rawBody)
        .digest("hex");

      if (mockRequest.headers)
        mockRequest.headers["x-hub-signature-256"] = `sha256=${hash}`;

      await POST(mockRequest as MedusaRequest, mockResponse as MedusaResponse);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Processing WhatsApp message"),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith("OK");
    });

    it("should skip processing if message is not text", async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  contacts: [{ profile: { name: "Test User" }, wa_id: "789" }],
                  messages: [
                    {
                      from: "789",
                      id: "msg_id",
                      timestamp: "1234567890",
                      type: "image",
                    },
                  ],
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "123",
                    phone_number_id: "456",
                  },
                },
              },
            ],
            id: "entry_id",
          },
        ],
        object: "whatsapp_business_account",
      };

      mockRequest.body = payload;
      mockRequest.rawBody = JSON.stringify(payload);

      const hash = crypto
        .createHmac("sha256", validSecret)
        .update(mockRequest.rawBody)
        .digest("hex");

      if (mockRequest.headers)
        mockRequest.headers["x-hub-signature-256"] = `sha256=${hash}`;

      await POST(mockRequest as MedusaRequest, mockResponse as MedusaResponse);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Received non-text WhatsApp message of type: image",
        ),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith("OK");
    });

    it("should return 400 on parsing failure", async () => {
      const payload = {
        entry: [
          {
            // Invalid entry structure missing 'changes'
            id: "123", // Adding ID to see if it fixes one error, but keeping changes undefined
          },
        ],
        object: "whatsapp_business_account",
      };

      mockRequest.body = payload;
      mockRequest.rawBody = JSON.stringify(payload);

      const hash = crypto
        .createHmac("sha256", validSecret)
        .update(mockRequest.rawBody)
        .digest("hex");

      if (mockRequest.headers)
        mockRequest.headers["x-hub-signature-256"] = `sha256=${hash}`;

      await POST(mockRequest as MedusaRequest, mockResponse as MedusaResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid payload format",
      });
    });
  });
});
