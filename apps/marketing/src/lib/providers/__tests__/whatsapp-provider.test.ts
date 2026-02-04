import { describe, it, expect, vi, beforeEach } from "vitest";

import { createWhatsAppProvider } from "../whatsapp-provider";

import type { consoleLogger } from "@vendin/utils/logger-cloudflare-factory";

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as unknown as typeof consoleLogger;

// Mock the provider classes
vi.mock("../facebook-provider", () => ({
  FacebookWhatsAppProvider: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn().mockResolvedValue(),
  })),
}));

vi.mock("../twilio-provider", () => ({
  TwilioWhatsAppProvider: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn().mockResolvedValue(),
  })),
}));

describe("createWhatsAppProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create Facebook provider with valid config", () => {
    const provider = createWhatsAppProvider({
      provider: "facebook",
      facebook: {
        accessToken: "test-token",
        phoneNumberId: "123456789",
        apiVersion: "v21.0",
      },
      logger: mockLogger,
    });

    expect(provider).toBeDefined();
    expect(provider.sendMessage).toBeDefined();
  });

  it("should create Twilio provider with valid config", () => {
    const provider = createWhatsAppProvider({
      provider: "twilio",
      twilio: {
        accountSid: "AC123",
        authToken: "token456",
        fromNumber: "+14155238886",
      },
      logger: mockLogger,
    });

    expect(provider).toBeDefined();
    expect(provider.sendMessage).toBeDefined();
  });

  it("should throw error when Facebook config is missing", () => {
    expect(() =>
      createWhatsAppProvider({
        provider: "facebook",
        logger: mockLogger,
      }),
    ).toThrow("Facebook configuration is required when provider is 'facebook'");
  });

  it("should throw error when Twilio config is missing", () => {
    expect(() =>
      createWhatsAppProvider({
        provider: "twilio",
        logger: mockLogger,
      }),
    ).toThrow("Twilio configuration is required when provider is 'twilio'");
  });

  it("should throw error for unsupported provider", () => {
    expect(() =>
      createWhatsAppProvider({
        provider: "invalid-provider" as unknown,
        logger: mockLogger,
      }),
    ).toThrow("Unsupported WhatsApp provider");
  });

  it("should use default API version for Facebook when not provided", () => {
    const provider = createWhatsAppProvider({
      provider: "facebook",
      facebook: {
        accessToken: "test-token",
        phoneNumberId: "123456789",
      },
      logger: mockLogger,
    });

    expect(provider).toBeDefined();
  });
});
