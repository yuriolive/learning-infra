import { beforeAll, describe, expect, it, vi } from "vitest";

import { WhatsappWebhookService } from "../service";

// Mock @vendin/utils
vi.mock("@vendin/utils", () => ({
  isPrivateIp: vi.fn(),
  resolveIps: vi.fn(),
}));

import { isPrivateIp, resolveIps } from "@vendin/utils";

describe("WhatsappWebhookService SSRF Protection", () => {
  let service: WhatsappWebhookService;
  const mockTenantLookup = {
    findByWhatsAppNumber: vi.fn(),
  };
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  } as unknown;

  beforeAll(() => {
    service = new WhatsappWebhookService(
      mockTenantLookup as unknown,
      mockLogger,
    );
  });

  it("should block request if hostname resolves to private IP", async () => {
    const apiUrl = "http://my-internal-service.local";
    mockTenantLookup.findByWhatsAppNumber.mockResolvedValue({
      id: "tenant-1",
      apiUrl,
    });
    vi.mocked(resolveIps).mockResolvedValue(["192.168.1.1"]);
    vi.mocked(isPrivateIp).mockReturnValue(true);

    const change = { value: { metadata: { display_phone_number: "123456" } } };
    await (service as unknown).processChange(change, {});

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl, resolvedIps: ["192.168.1.1"] }),
      expect.stringContaining("Blocked forwarding to private/internal URL"),
    );
  });

  it("should allow request if hostname resolves to public IP", async () => {
    const apiUrl = "https://api.tenant.com";
    mockTenantLookup.findByWhatsAppNumber.mockResolvedValue({
      id: "tenant-1",
      apiUrl,
    });
    vi.mocked(resolveIps).mockResolvedValue(["8.8.8.8"]);
    vi.mocked(isPrivateIp).mockReturnValue(false);

    // Mock fetch to avoid actual network call
    const globalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    const change = { value: { metadata: { display_phone_number: "123456" } } };
    await (service as unknown).processChange(change, {});

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.tenant.com/webhooks/whatsapp"),
      expect.any(Object),
    );

    globalThis.fetch = globalFetch;
  });

  it("should block request if hostname resolution fails", async () => {
    const apiUrl = "https://invalid-host";
    mockTenantLookup.findByWhatsAppNumber.mockResolvedValue({
      id: "tenant-1",
      apiUrl,
    });
    vi.mocked(resolveIps).mockResolvedValue([]);

    const change = { value: { metadata: { display_phone_number: "123456" } } };
    await (service as unknown).processChange(change, {});

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl, resolvedIps: [] }),
      expect.stringContaining("Blocked forwarding to private/internal URL"),
    );
  });
});
