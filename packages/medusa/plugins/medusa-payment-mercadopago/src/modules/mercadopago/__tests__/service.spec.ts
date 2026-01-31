import { Payment, PaymentRefund } from "mercadopago";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  AuthorizePaymentInput,
  CapturePaymentInput,
  GetPaymentStatusInput,
  RefundPaymentInput,
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
      { accessToken: "test_token", webhookSecret: "test_secret" },
    );
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
          token: "card_token",
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
        point_of_interaction: {},
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
            payer: { email: "test@test.com" },
          }),
        }),
      );

      expect(result.status).toBe("authorized");
      expect(result.data).toEqual(
        expect.objectContaining({
          externalId: "mp_123",
          status: "approved",
        }),
      );
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

    it("should throw error during authorization failure", async () => {
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
  });
});
