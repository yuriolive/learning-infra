import { isPrivateIp, resolveIps } from "@vendin/utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { FacebookWhatsAppProvider } from "../facebook-provider";

import type { consoleLogger } from "@vendin/logger";

vi.mock("@vendin/utils", () => ({
  isPrivateIp: vi.fn().mockReturnValue(false),
  resolveIps: vi.fn().mockResolvedValue(["8.8.8.8"]),
}));

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as unknown as typeof consoleLogger;

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

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

    expect(mockFetch).toHaveBeenCalledWith(expect.any(URL), {
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
    });

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0].toString()).toBe(
      "https://graph.facebook.com/v21.0/123456789/messages",
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

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0].toString()).toContain("v21.0");
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
      text: () => Promise.resolve("Invalid phone number"),
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

  describe("SSRF Protection", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it("should block request if hostname resolves to a private IP", async () => {
      vi.mocked(resolveIps).mockResolvedValueOnce(["192.168.1.1"]);
      vi.mocked(isPrivateIp).mockReturnValue(true);

      const provider = new FacebookWhatsAppProvider(
        {
          accessToken: "test-token",
          phoneNumberId: "123456789",
        },
        mockLogger,
      );

      await expect(provider.sendMessage("+1234567890", "Test")).rejects.toThrow(
        "Potential SSRF attack blocked",
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ resolvedIps: ["192.168.1.1"] }),
        "Blocked request to private/internal URL (SSRF Protection)",
      );
    });

    it("should block request if hostname cannot be resolved", async () => {
      vi.mocked(resolveIps).mockResolvedValueOnce([]);
      vi.mocked(isPrivateIp).mockReturnValue(false);

      const provider = new FacebookWhatsAppProvider(
        {
          accessToken: "test-token",
          phoneNumberId: "123456789",
        },
        mockLogger,
      );

      await expect(provider.sendMessage("+1234567890", "Test")).rejects.toThrow(
        "Potential SSRF attack blocked",
      );
    });
  });
});
