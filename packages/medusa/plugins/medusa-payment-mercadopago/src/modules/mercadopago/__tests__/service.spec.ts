import { describe, it, expect, vi, beforeEach } from "vitest";
import MercadoPagoPaymentProviderService from "../service.js";
import { Payment, PaymentRefund } from "mercadopago";

// Mock mercadopago SDK
vi.mock("mercadopago", () => {
  return {
    MercadoPagoConfig: vi.fn(),
    Payment: vi.fn(),
    PaymentRefund: vi.fn()
  };
});

describe("MercadoPagoPaymentProviderService", () => {
  let service: MercadoPagoPaymentProviderService;
  let loggerMock: any;
  let paymentClientMock: any;
  let refundClientMock: any;

  beforeEach(() => {
    loggerMock = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
    paymentClientMock = {
      create: vi.fn(),
      get: vi.fn(),
      cancel: vi.fn(),
      capture: vi.fn()
    };
    refundClientMock = {
      create: vi.fn()
    };

    (Payment as any).mockImplementation(() => paymentClientMock);
    (PaymentRefund as any).mockImplementation(() => refundClientMock);

    service = new MercadoPagoPaymentProviderService({ logger: loggerMock } as any, { accessToken: "test_token" });
  });

  it("should instantiate correctly", () => {
    expect(service).toBeDefined();
    expect(MercadoPagoPaymentProviderService.identifier).toBe("mercadopago");
  });

  describe("authorizePayment", () => {
    it("should authorize payment successfully", async () => {
      const input = {
        data: {
          sessionId: "sess_123",
          amount: 1000, // 10.00
          paymentMethodId: "visa",
          installments: 1,
          token: "card_token"
        },
        context: {
          customer: { email: "test@test.com" },
          idempotency_key: "idem_123"
        }
      };

      paymentClientMock.create.mockResolvedValue({
        id: "mp_123",
        status: "approved",
        point_of_interaction: {}
      });

      const result = await service.authorizePayment(input as any);

      expect(paymentClientMock.create).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({
          transaction_amount: 10,
          description: "Order idem_123",
          external_reference: "sess_123",
          payer: { email: "test@test.com" }
        })
      }));

      expect(result.status).toBe("authorized");
      expect(result.data).toEqual(expect.objectContaining({
        externalId: "mp_123",
        status: "approved"
      }));
    });

    it("should handle pending payment status", async () => {
      const input = {
        data: { sessionId: "sess_123", amount: 1000 },
        context: { customer: {} }
      };

      paymentClientMock.create.mockResolvedValue({
        id: "mp_123",
        status: "in_process"
      });

      const result = await service.authorizePayment(input as any);

      expect(result.status).toBe("pending");
    });

    it("should handle error during authorization", async () => {
      const input = {
        data: { sessionId: "sess_123", amount: 1000 },
        context: {}
      };

      paymentClientMock.create.mockRejectedValue(new Error("API Error"));

      const result = await service.authorizePayment(input as any);

      expect(result.status).toBe("error");
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  describe("capturePayment", () => {
    it("should capture payment successfully", async () => {
      const input = {
        data: { externalId: "mp_123" }
      };

      paymentClientMock.capture.mockResolvedValue({ status: "approved" });

      const result = await service.capturePayment(input as any);

      expect(paymentClientMock.capture).toHaveBeenCalledWith({ id: "mp_123" });
      expect(result.data).toEqual(expect.objectContaining({ status: "approved" }));
    });
  });

  describe("refundPayment", () => {
    it("should refund payment successfully", async () => {
      const input = {
        data: { externalId: "mp_123" },
        amount: 500 // 5.00
      };

      refundClientMock.create.mockResolvedValue({ id: "ref_123" });

      const result = await service.refundPayment(input as any);

      expect(refundClientMock.create).toHaveBeenCalledWith({
        payment_id: "mp_123",
        body: { amount: 5 }
      });
      expect(result.data).toEqual(expect.objectContaining({ refundId: "ref_123" }));
    });
  });

  describe("getPaymentStatus", () => {
    it("should map approved status to authorized", async () => {
      const input = { data: { externalId: "mp_123" } };
      paymentClientMock.get.mockResolvedValue({ status: "approved" });

      const result = await service.getPaymentStatus(input as any);

      expect(result.status).toBe("authorized");
    });

    it("should map cancelled status to canceled", async () => {
        const input = { data: { externalId: "mp_123" } };
        paymentClientMock.get.mockResolvedValue({ status: "cancelled" });

        const result = await service.getPaymentStatus(input as any);

        expect(result.status).toBe("canceled");
      });
  });
});
