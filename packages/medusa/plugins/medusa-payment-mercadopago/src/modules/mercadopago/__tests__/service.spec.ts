import { describe, it, expect, vi } from "vitest";
import MercadoPagoPaymentProviderService from "../service.js";

describe("MercadoPagoPaymentProviderService", () => {
  it("should instantiate correctly", () => {
    const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
    const options = { accessToken: "test_token" };

    // Mock AbstractPaymentProvider dependency injection
    // Since we are testing instantiation, we just pass what constructor expects
    const service = new MercadoPagoPaymentProviderService({ logger } as any, options);

    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(MercadoPagoPaymentProviderService);
    expect(MercadoPagoPaymentProviderService.identifier).toBe("mercadopago");
  });
});
