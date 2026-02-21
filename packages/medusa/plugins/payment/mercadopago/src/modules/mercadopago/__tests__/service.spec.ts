import { Payment, PaymentRefund } from "mercadopago";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  AuthorizePaymentInput,
  CapturePaymentInput,
  GetPaymentStatusInput,
  RefundPaymentInput,
  CancelPaymentInput,
  DeletePaymentInput,
  InitiatePaymentInput,
  RetrievePaymentInput,
  UpdatePaymentInput,
} from "@medusajs/types";

// Mock @medusajs/framework/utils BEFORE importing service
vi.mock("@medusajs/framework/utils", () => {
  return {
    AbstractPaymentProvider: class {
      protected container: unknown;
      protected options: unknown;
      constructor(container: unknown, options: unknown) {
        this.container = container;
        this.options = options;
      }
    },
  };
});

import MercadoPagoPaymentProviderService from "../service.js";

// Mock mercadopago SDK
vi.mock("mercadopago", () => {
  return {
    MercadoPagoConfig: vi.fn(),
    Payment: vi.fn(),
    PaymentRefund: vi.fn(),
  };
});

// Mock crypto randomUUID
vi.mock("node:crypto", async () => {
  const actual = await vi.importActual("node:crypto");
  return {
    ...actual,
    randomUUID: () => "uuid_123",
  };
});

describe("MercadoPagoPaymentProviderService", () => {
  let service: MercadoPagoPaymentProviderService;
  let loggerMock: unknown;
  let paymentClientMock: unknown;
  let refundClientMock: unknown;

  beforeEach(() => {
    loggerMock = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };
    paymentClientMock = {
      create: vi.fn(),
      get: vi.fn(),
      cancel: vi.fn(),
      capture: vi.fn(),
    };
    refundClientMock = {
      create: vi.fn(),
    };

    // Use regular functions for mockImplementation to support 'new'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Payment as any).mockImplementation(function () {
      return paymentClientMock;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PaymentRefund as any).mockImplementation(function () {
      return refundClientMock;
    });

    service = new MercadoPagoPaymentProviderService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { logger: loggerMock as any } as any,
      { accessToken: "test_token", webhookSecret: "test_secret", webhookUrl: "https://webhook.url" },
    );
  });

  it("should instantiate correctly", () => {
    expect(service).toBeDefined();
    //  accessing static
    expect(MercadoPagoPaymentProviderService.identifier).toBe("mercadopago");
  });

  describe("initiatePayment", () => {
    it("should initiate payment correctly", async () => {
      const input = {
        amount: 1000,
        currency_code: "BRL",
        data: { some: "data" },
      };

      const result = await service.initiatePayment(input as unknown as InitiatePaymentInput);

      expect(result.id).toBe("mp_sess_uuid_123");
      expect(result.status).toBe("pending");
      expect(result.data).toEqual({
        some: "data",
        sessionId: "mp_sess_uuid_123",
        amount: 1000,
        currency_code: "BRL",
      });
    });
  });

  describe("retrievePayment", () => {
    it("should retrieve payment data", async () => {
      const input = { data: { foo: "bar" } };
      const result = await service.retrievePayment(input as unknown as RetrievePaymentInput);
      expect(result.data).toEqual({ foo: "bar" });
    });
  });

  describe("updatePayment", () => {
    it("should update payment data", async () => {
      const input = {
        data: { foo: "bar" },
        amount: 2000,
        currency_code: "USD"
      };
      const result = await service.updatePayment(input as unknown as UpdatePaymentInput);

      expect(result.status).toBe("pending");
      expect(result.data).toEqual({
        foo: "bar",
        amount: 2000,
        currency_code: "USD",
      });
    });
  });

  describe("deletePayment", () => {
    it("should return input data", async () => {
      const input = { data: { id: "123" } };
      const result = await service.deletePayment(input as unknown as DeletePaymentInput);
      expect(result.data).toEqual({ id: "123" });
    });
  });

  describe("authorizePayment", () => {
    it("should authorize payment successfully with all options", async () => {
      const input = {
        data: {
          sessionId: "sess_123",
          amount: 1000, // 10.00
          paymentMethodId: "visa",
          installments: 1,
          token: "card_token",
          issuerId: "1234",
          identification: {
            type: "CPF",
            number: "12345678909",
          }
        },
        context: {
          customer: { email: "test@test.com" },
          idempotency_key: "idem_123",
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).create.mockResolvedValue({
        id: "mp_123",
        status: "approved",
        point_of_interaction: {
          transaction_data: {
            qr_code: "qr_code_data",
            qr_code_base64: "base64",
            ticket_url: "url",
          }
        },
      });

      const result = await service.authorizePayment(
        input as unknown as AuthorizePaymentInput,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((paymentClientMock as any).create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            transaction_amount: 10,
            description: "Order idem_123",
            external_reference: "sess_123",
            payer: expect.objectContaining({
              email: "test@test.com",
              identification: {
                type: "CPF",
                number: "12345678909",
              }
            }),
            token: "card_token",
            issuer_id: 1234,
            notification_url: "https://webhook.url",
          }),
        }),
      );

      expect(result.status).toBe("authorized");
      expect(result.data).toEqual(
        expect.objectContaining({
          externalId: "mp_123",
          status: "approved",
          qr_code: "qr_code_data",
        }),
      );
    });

    it("should authorize payment successfully without point_of_interaction", async () => {
      const input = {
        data: {
          sessionId: "sess_123",
          amount: 1000,
        },
        context: {
          customer: { email: "test@test.com" },
        },
      };

      (paymentClientMock as any).create.mockResolvedValue({
        id: "mp_123",
        status: "approved",
        // No point_of_interaction
      });

      const result = await service.authorizePayment(
        input as unknown as AuthorizePaymentInput,
      );

      expect(result.status).toBe("authorized");
      expect(result.data).toEqual(
        expect.objectContaining({
          externalId: "mp_123",
          status: "approved",
        }),
      );
      // Ensure no qr_code data
      expect(result.data).not.toHaveProperty("qr_code");
    });

    it("should authorize payment successfully with point_of_interaction but no transaction_data", async () => {
      const input = {
        data: {
          sessionId: "sess_123",
          amount: 1000,
        },
        context: {
          customer: { email: "test@test.com" },
        },
      };

      (paymentClientMock as any).create.mockResolvedValue({
        id: "mp_123",
        status: "approved",
        point_of_interaction: {},
      });

      const result = await service.authorizePayment(
        input as unknown as AuthorizePaymentInput,
      );

      expect(result.status).toBe("authorized");
      expect(result.data).not.toHaveProperty("qr_code");
    });

    it("should throw error if sessionId missing", async () => {
      const input = {
        data: { amount: 1000 },
        context: {},
      };

      await expect(service.authorizePayment(input as any)).rejects.toThrow("Session ID missing");
    });

    it("should handle pending payment status", async () => {
      const input = {
        data: { sessionId: "sess_123", amount: 1000 },
        context: { customer: {} },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).create.mockResolvedValue({
        id: "mp_123",
        status: "in_process",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await service.authorizePayment(input as any);

      expect(result.status).toBe("pending");
    });

    it("should throw error during authorization failure (insufficient amount)", async () => {
      const input = {
        data: { sessionId: "sess_123", amount: 1000 },
        context: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).create.mockRejectedValue(
        new Error("insufficient_amount"),
      );

      await expect(
        service.authorizePayment(input as unknown as AuthorizePaymentInput),
      ).rejects.toThrow("Payment declined: Insufficient funds");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((loggerMock as any).error).toHaveBeenCalled();
    });

    it("should throw error during authorization failure (bad request)", async () => {
      const input = {
        data: { sessionId: "sess_123", amount: 1000 },
        context: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).create.mockRejectedValue(
        new Error("bad_request"),
      );

      await expect(
        service.authorizePayment(input as unknown as AuthorizePaymentInput),
      ).rejects.toThrow("Payment declined: Invalid payment data");
    });
  });

  describe("capturePayment", () => {
    it("should capture payment successfully", async () => {
      const input = {
        data: { externalId: "mp_123" },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).capture.mockResolvedValue({
        status: "approved",
      });

      const result = await service.capturePayment(
        input as unknown as CapturePaymentInput,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((paymentClientMock as any).capture).toHaveBeenCalledWith({
        id: "mp_123",
      });
      expect(result.data).toEqual(
        expect.objectContaining({ status: "approved" }),
      );
    });

    it("should return data if externalId missing", async () => {
      const input = { data: { foo: "bar" } };
      const result = await service.capturePayment(input as any);
      expect(result.data).toEqual({ foo: "bar" });
      expect((paymentClientMock as any).capture).not.toHaveBeenCalled();
    });

    it("should throw error on capture failure", async () => {
      const input = {
        data: { externalId: "mp_123" },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).capture.mockRejectedValue(new Error("Fail"));

      await expect(
        service.capturePayment(input as unknown as CapturePaymentInput),
      ).rejects.toThrow("Failed to capture payment: Fail");
    });
  });

  describe("cancelPayment", () => {
    it("should cancel payment successfully", async () => {
      const input = {
        data: { externalId: "mp_123" },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).cancel.mockResolvedValue({});

      const result = await service.cancelPayment(input as unknown as CancelPaymentInput);

      expect((paymentClientMock as any).cancel).toHaveBeenCalledWith({ id: "mp_123" });
      expect(result.data).toEqual(expect.objectContaining({ status: "canceled" }));
    });

    it("should return data if externalId missing", async () => {
      const input = { data: { foo: "bar" } };
      const result = await service.cancelPayment(input as any);
      expect(result.data).toEqual({ foo: "bar" });
      expect((paymentClientMock as any).cancel).not.toHaveBeenCalled();
    });

    it("should throw error on cancel failure", async () => {
       const input = {
        data: { externalId: "mp_123" },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).cancel.mockRejectedValue(new Error("Fail"));

      await expect(
        service.cancelPayment(input as unknown as CancelPaymentInput),
      ).rejects.toThrow("Failed to cancel payment: Fail");
    });
  });

  describe("refundPayment", () => {
    it("should refund payment successfully", async () => {
      const input = {
        data: { externalId: "mp_123" },
        amount: 500, // 5.00
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (refundClientMock as any).create.mockResolvedValue({ id: "ref_123" });

      const result = await service.refundPayment(
        input as unknown as RefundPaymentInput,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((refundClientMock as any).create).toHaveBeenCalledWith({
        payment_id: "mp_123",
        body: { amount: 5 },
      });
      expect(result.data).toEqual(
        expect.objectContaining({ refundId: "ref_123" }),
      );
    });

     it("should throw error on refund failure", async () => {
      const input = {
        data: { externalId: "mp_123" },
        amount: 500,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (refundClientMock as any).create.mockRejectedValue(new Error("Fail"));

      await expect(
        service.refundPayment(input as unknown as RefundPaymentInput),
      ).rejects.toThrow("Failed to refund payment: Fail");
    });
  });

  describe("getPaymentStatus", () => {
    it("should map approved status to authorized", async () => {
      const input = { data: { externalId: "mp_123" } };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).get.mockResolvedValue({ status: "approved" });

      const result = await service.getPaymentStatus(
        input as unknown as GetPaymentStatusInput,
      );

      expect(result.status).toBe("authorized");
    });

    it("should map cancelled status to canceled", async () => {
      const input = { data: { externalId: "mp_123" } };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).get.mockResolvedValue({ status: "cancelled" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await service.getPaymentStatus(input as any);

      expect(result.status).toBe("canceled");
    });

    it("should return error if externalId missing", async () => {
      const input = { data: { foo: "bar" } };
      const result = await service.getPaymentStatus(input as any);
      expect(result.status).toBe("error");
    });

    it("should return error status on failure", async () => {
       const input = { data: { externalId: "mp_123" } };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).get.mockRejectedValue(new Error("Fail"));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await service.getPaymentStatus(input as any);

      expect(result.status).toBe("error");
      expect((loggerMock as any).error).toHaveBeenCalled();
    });
  });

  describe("getWebhookActionAndData", () => {
    it("should verify signature and return authorized for approved payment", async () => {
      const testWebhookSecret = "test_secret";
      const ts = "123456";
      const requestId = "req_123";
      const dataId = "data_123";
      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const { createHmac } = await import("node:crypto");
      const hmac = createHmac("sha256", testWebhookSecret)
        .update(manifest)
        .digest("hex");

      const payload = {
        data: { id: "mp_123" },
        headers: {
          "x-signature": `ts=${ts},v1=${hmac}`,
          "x-request-id": requestId,
        },
        query: {
          "data.id": dataId,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paymentClientMock as any).get.mockResolvedValue({
        id: "mp_123",
        status: "approved",
        external_reference: "sess_123",
        transaction_amount: 10,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await service.getWebhookActionAndData(payload as any);

      expect(result).toEqual({
        action: "authorized",
        data: {
          session_id: "sess_123",
          amount: 1000,
        },
      });
    });

    it("should return failed action when signature verification fails", async () => {
      const payload = {
        data: { id: "mp_123" },
        headers: {
          "x-signature": "ts=123,v1=bad_sig",
          "x-request-id": "req_123",
        },
        query: { "data.id": "123" },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await service.getWebhookActionAndData(payload as any);

      expect(result).toEqual({ action: "failed" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((loggerMock as any).error).toHaveBeenCalledWith(
        expect.stringContaining("signature verification failed"),
      );
    });

    it("should return not_supported if paymentId missing", async () => {
       const payload = {
        data: { },
        headers: {},
        query: {},
      };

      // Override options to remove secret check for this test or mock verification
      service = new MercadoPagoPaymentProviderService(
        { logger: loggerMock as any } as any,
        { accessToken: "token" } // no secret
      );

      const result = await service.getWebhookActionAndData(payload as any);
      expect(result).toEqual({ action: "not_supported" });
    });

    it("should return failed action for rejected payment", async () => {
       service = new MercadoPagoPaymentProviderService(
        { logger: loggerMock as any } as any,
        { accessToken: "token" }
      );

      const payload = { data: { id: "mp_123" }, headers: {}, query: {} };

      (paymentClientMock as any).get.mockResolvedValue({
        id: "mp_123",
        status: "rejected",
      });

      const result = await service.getWebhookActionAndData(payload as any);
      expect(result).toEqual({ action: "failed" });
    });

    it("should return not_supported action for other payment statuses", async () => {
       service = new MercadoPagoPaymentProviderService(
        { logger: loggerMock as any } as any,
        { accessToken: "token" }
      );

      const payload = { data: { id: "mp_123" }, headers: {}, query: {} };

      (paymentClientMock as any).get.mockResolvedValue({
        id: "mp_123",
        status: "pending",
      });

      const result = await service.getWebhookActionAndData(payload as any);
      expect(result).toEqual({ action: "not_supported" });
    });

    it("should return failed action on error", async () => {
       service = new MercadoPagoPaymentProviderService(
        { logger: loggerMock as any } as any,
        { accessToken: "token" }
      );

      const payload = { data: { id: "mp_123" }, headers: {}, query: {} };

      (paymentClientMock as any).get.mockRejectedValue(new Error("Fail"));

      const result = await service.getWebhookActionAndData(payload as any);
      expect(result).toEqual({ action: "failed" });
      expect((loggerMock as any).error).toHaveBeenCalled();
    });
  });
});
