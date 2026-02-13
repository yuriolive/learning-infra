import { describe, it, expect, vi, beforeEach } from "vitest";

import { FacebookWhatsAppProvider } from "../facebook-provider";

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

describe("FacebookWhatsAppProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send WhatsApp message successfully", async () => {
    const provider = new FacebookWhatsAppProvider(
      {
        accessToken: "test-token",
        phoneNumberId: "123456789",
        apiVersion: "v21.0",
      },
      mockLogger,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await provider.sendMessage("+1234567890", "Test message");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/123456789/messages",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "1234567890", // Without leading +
          type: "text",
          text: {
            body: "Test message",
          },
        }),
      },
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      { to: "1234****7890" },
      "WhatsApp message sent successfully via Facebook",
    );
  });

  it("should use default API version when not specified", async () => {
    const provider = new FacebookWhatsAppProvider(
      {
        accessToken: "test-token",
        phoneNumberId: "123456789",
      },
      mockLogger,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await provider.sendMessage("+1234567890", "Test");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("v21.0"),
      expect.any(Object),
    );
  });

  it("should handle API errors", async () => {
    const provider = new FacebookWhatsAppProvider(
      {
        accessToken: "test-token",
        phoneNumberId: "123456789",
      },
      mockLogger,
    );

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Invalid phone number",
    });

    await expect(provider.sendMessage("+invalid", "Test")).rejects.toThrow(
      "Facebook WhatsApp API error",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
      "Failed to send WhatsApp message via Facebook",
    );
  });

  it("should handle network errors", async () => {
    const provider = new FacebookWhatsAppProvider(
      {
        accessToken: "test-token",
        phoneNumberId: "123456789",
      },
      mockLogger,
    );

    const networkError = new Error("Network error");
    mockFetch.mockRejectedValueOnce(networkError);

    await expect(provider.sendMessage("+1234567890", "Test")).rejects.toThrow(
      "Network error",
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: networkError }),
      "Error sending WhatsApp message via Facebook",
    );
  });

  it("should remove leading + from phone number", async () => {
    const provider = new FacebookWhatsAppProvider(
      {
        accessToken: "test-token",
        phoneNumberId: "123456789",
      },
      mockLogger,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await provider.sendMessage("+551199999999", "Test");

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);

    expect(body.to).toBe("551199999999");
  });
});
