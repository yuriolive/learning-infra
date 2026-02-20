import { describe, it, expect, vi, beforeEach } from "vitest";

import { createWhatsAppProvider } from "../whatsapp-provider";

import type { consoleLogger } from "@vendin/logger";

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as unknown as typeof consoleLogger;

// Mock the provider classes
vi.mock("../facebook-provider", () => ({
  FacebookWhatsAppProvider: vi.fn().mockImplementation(function () {
    return {
      sendMessage: vi.fn().mockResolvedValue(undefined as unknown as void),
    };
  }),
}));

vi.mock("../twilio-provider", () => ({
  TwilioWhatsAppProvider: vi.fn().mockImplementation(function () {
    return {
      sendMessage: vi.fn().mockResolvedValue(undefined as unknown as void),
    };
  }),
}));

describe("createWhatsAppProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ... (keeping other tests as is, only fixing the invalid provider test below)

  it("should throw error for unsupported provider", async () => {
    await expect(
      createWhatsAppProvider({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider: "invalid-provider" as any,
        logger: mockLogger,
      }),
    ).rejects.toThrow("Unsupported WhatsApp provider");
  });

  it("should create Facebook provider successfully", async () => {
    const provider = await createWhatsAppProvider({
      provider: "facebook",
      facebook: {
        accessToken: "test-token",
        phoneNumberId: "123456789",
      },
      logger: mockLogger,
    });

    expect(provider).toBeDefined();
  });

  it("should create Twilio provider successfully", async () => {
    const provider = await createWhatsAppProvider({
      provider: "twilio",
      twilio: {
        accountSid: "test-sid",
        authToken: "test-token",
        fromNumber: "123456789",
      },
      logger: mockLogger,
    });

    expect(provider).toBeDefined();
  });
});
