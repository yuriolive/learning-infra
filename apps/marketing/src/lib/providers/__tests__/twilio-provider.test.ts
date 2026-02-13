import { describe, it, expect, vi, beforeEach } from "vitest";

import { TwilioWhatsAppProvider } from "../twilio-provider";

import type { consoleLogger } from "@vendin/logger";

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as unknown as typeof consoleLogger;

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("TwilioWhatsAppProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send WhatsApp message successfully", async () => {
    const provider = new TwilioWhatsAppProvider(
      {
        accountSid: "AC123456789",
        authToken: "test-auth-token",
        fromNumber: "+14155238886",
      },
      mockLogger,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
    });

    await provider.sendMessage("+1234567890", "Test message");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Basic"),
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      }),
    );

    const fetchCall = mockFetch.mock.calls[0];
    const body = fetchCall[1].body;

    expect(body).toContain("From=whatsapp%3A%2B14155238886");
    expect(body).toContain("To=whatsapp%3A%2B1234567890");
    expect(body).toContain("Body=Test+message");

    expect(mockLogger.info).toHaveBeenCalledWith(
      { to: "+123****7890" },
      "WhatsApp message sent successfully via Twilio",
    );
  });

  it("should use Basic Auth with correct credentials", async () => {
    const provider = new TwilioWhatsAppProvider(
      {
        accountSid: "AC123",
        authToken: "token456",
        fromNumber: "+14155238886",
      },
      mockLogger,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
    });

    await provider.sendMessage("+1234567890", "Test");

    const fetchCall = mockFetch.mock.calls[0];
    const authHeader = fetchCall[1].headers.Authorization;

    // Verify it's Base64 encoded AC123:token456
    const expectedAuth = Buffer.from("AC123:token456").toString("base64");
    expect(authHeader).toBe(`Basic ${expectedAuth}`);
  });

  it("should format phone numbers with whatsapp: prefix", async () => {
    const provider = new TwilioWhatsAppProvider(
      {
        accountSid: "AC123",
        authToken: "token456",
        fromNumber: "+14155238886",
      },
      mockLogger,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
    });

    await provider.sendMessage("+551199999999", "Test");

    const fetchCall = mockFetch.mock.calls[0];
    const body = fetchCall[1].body;

    expect(body).toContain("To=whatsapp%3A%2B551199999999");
  });

  it("should handle API errors", async () => {
    const provider = new TwilioWhatsAppProvider(
      {
        accountSid: "AC123",
        authToken: "token456",
        fromNumber: "+14155238886",
      },
      mockLogger,
    );

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => '{"error": "Invalid phone number"}',
    });

    await expect(provider.sendMessage("+invalid", "Test")).rejects.toThrow(
      "Twilio WhatsApp API error",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
      "Failed to send WhatsApp message via Twilio",
    );
  });

  it("should handle network errors", async () => {
    const provider = new TwilioWhatsAppProvider(
      {
        accountSid: "AC123",
        authToken: "token456",
        fromNumber: "+14155238886",
      },
      mockLogger,
    );

    const networkError = new Error("Network timeout");
    mockFetch.mockRejectedValueOnce(networkError);

    await expect(provider.sendMessage("+1234567890", "Test")).rejects.toThrow(
      "Network timeout",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: networkError }),
      "Error sending WhatsApp message via Twilio",
    );
  });

  it("should URL encode message body correctly", async () => {
    const provider = new TwilioWhatsAppProvider(
      {
        accountSid: "AC123",
        authToken: "token456",
        fromNumber: "+14155238886",
      },
      mockLogger,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
    });

    await provider.sendMessage("+1234567890", "Hello & Welcome!");

    const fetchCall = mockFetch.mock.calls[0];
    const body = fetchCall[1].body;

    // URLSearchParams will encode special characters
    expect(body).toContain("Body=Hello+%26+Welcome%21");
  });
});
