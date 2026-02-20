import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { type TenantLookup, WhatsappWebhookService } from "../service";

import type { consoleLogger } from "@vendin/logger";
vi.mock("@vendin/utils", () => ({
  validateSsrfProtection: vi.fn(),
  validatePublicUrl: vi.fn(),
}));

import { validatePublicUrl } from "@vendin/utils";

describe("WhatsappWebhookService SSRF Protection", () => {
  let service: WhatsappWebhookService;
  const mockTenantLookup = {
    findByWhatsAppPhoneId: vi.fn(),
    findByWhatsAppNumber: vi.fn(),
  } as unknown as TenantLookup;

  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  } as unknown as typeof consoleLogger;

  beforeAll(() => {
    service = new WhatsappWebhookService(mockTenantLookup, mockLogger);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should block request if hostname resolves to private IP", async () => {
    const apiUrl = "http://my-internal-service.local";
    (
      mockTenantLookup.findByWhatsAppPhoneId as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "tenant-1",
      apiUrl,
    });
    vi.mocked(validatePublicUrl).mockRejectedValue(
      new Error("Blocked forwarding to private/internal URL"),
    );

    const change = { value: { metadata: { phone_number_id: "123456" } } };
    await service["processChange"](change, {});

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl,
        error: "Blocked forwarding to private/internal URL",
      }),
      expect.stringContaining("Failed to validate instance webhook URL"),
    );
  });

  it("should allow request if hostname resolves to public IP", async () => {
    const apiUrl = "https://api.tenant.com";
    (
      mockTenantLookup.findByWhatsAppPhoneId as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "tenant-1",
      apiUrl,
    });
    vi.mocked(validatePublicUrl).mockResolvedValue();

    // Mock fetch to avoid actual network call
    const globalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    const change = { value: { metadata: { phone_number_id: "123456" } } };
    await service["processChange"](change, {});

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.tenant.com/webhooks/whatsapp"),
      expect.any(Object),
    );

    globalThis.fetch = globalFetch;
  });

  it("should block request if hostname resolution fails", async () => {
    const apiUrl = "https://invalid-host";
    (
      mockTenantLookup.findByWhatsAppPhoneId as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "tenant-1",
      apiUrl,
    });
    vi.mocked(validatePublicUrl).mockRejectedValue(
      new Error("DNS resolution failed"),
    );

    const change = { value: { metadata: { phone_number_id: "123456" } } };
    await service["processChange"](change, {});

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl, error: "DNS resolution failed" }),
      expect.stringContaining("Failed to validate instance webhook URL"),
    );
  });

  it("should fallback to findByWhatsAppNumber if phone_number_id is missing", async () => {
    const apiUrl = "https://api.tenant.com";
    (
      mockTenantLookup.findByWhatsAppNumber as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "tenant-2",
      apiUrl,
    });
    vi.mocked(validatePublicUrl).mockResolvedValue();

    const change = {
      value: { metadata: { display_phone_number: "5511999999999" } },
    };

    const globalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    await service["processChange"](change, {});

    expect(mockTenantLookup.findByWhatsAppPhoneId).not.toHaveBeenCalled();
    expect(mockTenantLookup.findByWhatsAppNumber).toHaveBeenCalledWith(
      "5511999999999",
    );

    globalThis.fetch = globalFetch;
  });

  it("should fallback to findByWhatsAppNumber if findByWhatsAppPhoneId returns null", async () => {
    const apiUrl = "https://api.tenant.com";
    (
      mockTenantLookup.findByWhatsAppPhoneId as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);
    (
      mockTenantLookup.findByWhatsAppNumber as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "tenant-3",
      apiUrl,
    });
    vi.mocked(validatePublicUrl).mockResolvedValue();

    const change = {
      value: {
        metadata: {
          phone_number_id: "123",
          display_phone_number: "5511999999999",
        },
      },
    };

    const globalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    await service["processChange"](change, {});

    expect(mockTenantLookup.findByWhatsAppPhoneId).toHaveBeenCalledWith("123");
    expect(mockTenantLookup.findByWhatsAppNumber).toHaveBeenCalledWith(
      "5511999999999",
    );

    globalThis.fetch = globalFetch;
  });
});
