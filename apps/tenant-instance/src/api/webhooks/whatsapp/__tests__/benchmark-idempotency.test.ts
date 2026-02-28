import { Modules } from "@medusajs/framework/utils";

import { POST } from "../route";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const mockSignature = "sha256=MOCK_SIGNATURE";

// We need a dummy raw body matching the signature. For the test we'll mock crypto.
import crypto from "node:crypto";
const originalTimingSafeEqual = crypto.timingSafeEqual;
crypto.timingSafeEqual = () => true;

process.env.WHATSAPP_APP_SECRET = "secret";

const mockPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "entry1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "123",
              phone_number_id: "123",
            },
            contacts: [{ profile: { name: "Test" }, wa_id: "1234567890" }],
            messages: [
              {
                from: "1234567890",
                id: "wamid.HBgL",
                timestamp: "1234567890",
                type: "text",
                text: { body: "Hello" },
              },
            ],
          },
        },
      ],
    },
  ],
};

const mockCache = new Map();

const mockScope = {
  resolve: (key: string) => {
    if (key === "logger") {
      return { info: () => {}, warn: () => {}, error: () => {} };
    }
    if (key === Modules.CACHE) {
      return {
        get: async (k: string) => {
          await Promise.resolve();
          return mockCache.get(k);
        },
        set: async (k: string, v: unknown) => {
          await Promise.resolve();
          mockCache.set(k, v);
        },
      };
    }
    return {};
  },
};

const mockRequest = {
  headers: {
    "x-hub-signature-256": mockSignature,
  },
  rawBody: Buffer.from(JSON.stringify(mockPayload)),
  body: mockPayload,
  scope: mockScope,
} as unknown as MedusaRequest;

const mockResponse = {
  status: (_code: number) => ({
    send: (_message: string) => {},
    json: (_object: unknown) => {},
  }),
} as unknown as MedusaResponse;

async function runBenchmark() {
  console.log("Starting benchmark...");

  // First run
  const start1 = performance.now();
  await POST(mockRequest, mockResponse);
  const end1 = performance.now();
  console.log(`Run 1 (Baseline): ${(end1 - start1).toFixed(2)}ms`);

  // Second run
  const start2 = performance.now();
  await POST(mockRequest, mockResponse);
  const end2 = performance.now();
  console.log(`Run 2 (With same ID): ${(end2 - start2).toFixed(2)}ms`);

  crypto.timingSafeEqual = originalTimingSafeEqual;
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void runBenchmark();
