import { randomUUID } from "node:crypto";

import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import { MercadoPagoConfig, Payment, PaymentRefund } from "mercadopago";

import {
  convertToDecimal,
  convertFromDecimal,
  sanitizeIdentificationNumber,
} from "./utils/index.js";
import { mapMercadoPagoStatus } from "./utils/status-mapper.js";
import { verifyMercadoPagoSignature } from "./utils/webhook.js";

import type {
  MercadoPagoOptions,
  MercadoPagoPaymentData,
  MedusaPaymentContext,
  MercadoPagoPaymentRequest,
  MercadoPagoPaymentResponse,
} from "./types.js";
import type {
  Logger,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/types";

export default class MercadoPagoPaymentProviderService extends AbstractPaymentProvider {
  static override identifier = "mercadopago";
  protected config_: MercadoPagoConfig;
  protected paymentClient_: Payment;
  protected refundClient_: PaymentRefund;
  protected options_: MercadoPagoOptions;
  protected logger_: Logger;

  constructor(container: { logger: Logger }, options: MercadoPagoOptions) {
    super(container, options);
    this.options_ = options;
    this.logger_ = container.logger;

    if (!options.accessToken) {
      throw new Error("MercadoPago access token is required");
    }

    this.config_ = new MercadoPagoConfig({
      accessToken: options.accessToken,
      options: { timeout: 10_000 },
    });
    this.paymentClient_ = new Payment(this.config_);
    this.refundClient_ = new PaymentRefund(this.config_);
  }

  async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    const sessionId = `mp_sess_${randomUUID()}`;
    return {
      id: sessionId,
      status: "pending",
      data: {
        ...input.data,
        sessionId,
        amount: input.amount,
        currency_code: input.currency_code,
      },
    };
  }

  async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    return {
      data: input.data || {},
    };
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return {
      status: "pending",
      data: {
        ...input.data,
        amount: input.amount,
        currency_code: input.currency_code,
      },
    };
  }

  protected async preparePaymentPayload(
    paymentData: MercadoPagoPaymentData,
    context: MedusaPaymentContext,
  ): Promise<MercadoPagoPaymentRequest> {
    const amount = convertToDecimal(paymentData.amount || 0);
    const sessionId = paymentData.sessionId;

    if (!sessionId) {
      throw new Error("Session ID missing in payment data");
    }

    const { email } = context.customer || {};

    const payload: MercadoPagoPaymentRequest = {
      transaction_amount: amount,
      description: `Order ${context.idempotency_key || sessionId}`,
      external_reference: sessionId,
      payer: {
        email: email || "unknown@email.com",
      },
      payment_method_id: paymentData.paymentMethodId,
      installments: paymentData.installments || 1,
    };

    if (paymentData.token) {
      payload.token = paymentData.token;
    }

    if (paymentData.issuerId) {
      payload.issuer_id = Number(paymentData.issuerId);
    }

    if (paymentData.identification) {
      payload.payer.identification = {
        type: paymentData.identification.type,
        number: sanitizeIdentificationNumber(paymentData.identification.number),
      };
    }

    if (this.options_.webhookUrl) {
      payload.notification_url = this.options_.webhookUrl;
    }

    return payload;
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    try {
      const paymentData = (input.data || {}) as MercadoPagoPaymentData;
      const context = (input.context || {}) as unknown as MedusaPaymentContext;

      const payload = await this.preparePaymentPayload(paymentData, context);

      const response = await this.paymentClient_.create({
        body: payload,
        requestOptions: {
          idempotencyKey: context.idempotency_key || paymentData.sessionId,
        },
      });
      const mpPayment = response as unknown as MercadoPagoPaymentResponse;

      const status = mapMercadoPagoStatus(mpPayment.status || "pending");

      const newData: Record<string, unknown> = {
        ...paymentData,
        externalId: mpPayment.id,
        status: mpPayment.status,
      };

      if (mpPayment.point_of_interaction?.transaction_data) {
        Object.assign(newData, {
          qr_code: mpPayment.point_of_interaction.transaction_data.qr_code,
          qr_code_base64:
            mpPayment.point_of_interaction.transaction_data.qr_code_base64,
          ticket_url:
            mpPayment.point_of_interaction.transaction_data.ticket_url,
        });
      }

      return {
        data: newData,
        status,
      };
    } catch (error) {
      const error_ = error as Error;
      this.logger_.error(`MercadoPago authorization error: ${error_.message}`);
      return {
        data: { ...input.data, error: error_.message },
        status: "error",
      };
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    try {
      const id = input.data?.externalId as string;
      if (!id) return { data: input.data || {} };

      await this.paymentClient_.cancel({ id });
      return { data: { ...input.data, status: "canceled" } };
    } catch (error) {
      const error_ = error as Error;
      return {
        data: { ...input.data, error: error_.message },
      };
    }
  }

  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    try {
      const id = input.data?.externalId as string;
      if (id) {
        const response = await this.paymentClient_.capture({ id });
        return { data: { ...input.data, status: response.status } };
      }
      return { data: input.data || {} };
    } catch (error) {
      const error_ = error as Error;
      return {
        data: { ...input.data, error: error_.message },
      };
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data || {} };
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    const externalId = input.data?.externalId as string;
    if (!externalId) return { status: "pending", data: input.data || {} };

    try {
      const response = await this.paymentClient_.get({ id: externalId });
      const status = response.status;
      const medusaStatus = mapMercadoPagoStatus(status || "pending");

      return { status: medusaStatus, data: { ...input.data, status } };
    } catch {
      return { status: "error", data: input.data || {} };
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    try {
      const id = input.data?.externalId as string;
      const amount = convertToDecimal(input.amount);

      const response = await this.refundClient_.create({
        payment_id: id,
        body: { amount },
      });

      return { data: { ...input.data, refundId: response.id } };
    } catch (error) {
      const error_ = error as Error;
      return {
        data: { ...input.data, error: error_.message },
      };
    }
  }

  async getWebhookActionAndData(
    data: ProviderWebhookPayload["payload"] & {
      headers: Record<string, string>;
      query: Record<string, string>;
    },
  ): Promise<WebhookActionResult> {
    const { headers, query, ...payload } = data;

    if (this.options_.webhookSecret) {
      const isValid = verifyMercadoPagoSignature(
        headers,
        query,
        this.options_.webhookSecret,
      );
      if (!isValid) {
        this.logger_.error("MercadoPago webhook signature verification failed");
        return { action: "failed" };
      }
    }

    const { data: eventData } = payload as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const paymentId = eventData?.id;

    if (!paymentId) {
      return { action: "not_supported" };
    }

    try {
      const payment = (await this.paymentClient_.get({
        id: paymentId,
      })) as unknown as MercadoPagoPaymentResponse;

      if (payment.status === "approved") {
        return {
          action: "captured",
          data: {
            session_id: payment.external_reference || "",
            amount: convertFromDecimal(payment.transaction_amount!),
          },
        };
      }

      return { action: "not_supported" };
    } catch {
      return { action: "failed" };
    }
  }
}
