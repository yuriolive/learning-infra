import {
  AbstractPaymentProvider
} from "@medusajs/framework/utils";
import {
  Logger,
  PaymentSessionStatus,
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
  BigNumberInput
} from "@medusajs/types";
import { MercadoPagoConfig, Payment, PaymentRefund } from "mercadopago";
import { convertToDecimal, convertFromDecimal } from "./utils/index.js";
import { randomUUID } from "node:crypto";

type MercadoPagoOptions = {
  accessToken: string;
  webhookSecret?: string;
  webhookUrl?: string;
}

interface MercadoPagoPaymentData extends Record<string, unknown> {
  sessionId?: string;
  amount?: BigNumberInput;
  paymentMethodId?: string;
  installments?: number;
  token?: string;
  issuerId?: string;
  identification?: {
    type: string;
    number: string;
  };
  externalId?: string;
}

interface MedusaPaymentContext {
  customer?: {
    email?: string;
  };
  idempotency_key?: string;
}

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
       this.logger_.warn("MercadoPago access token not configured");
    }

    this.config_ = new MercadoPagoConfig({
      accessToken: options.accessToken || "placeholder",
      options: { timeout: 10000 }
    });
    this.paymentClient_ = new Payment(this.config_);
    this.refundClient_ = new PaymentRefund(this.config_);
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
      const sessionId = `mp_sess_${randomUUID()}`;
      return {
          id: sessionId,
          status: "pending",
          data: {
              ...input.data,
              sessionId: sessionId,
              amount: input.amount,
              currency_code: input.currency_code,
          }
      }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
      return {
          data: input.data || {}
      }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
      return {
          status: "pending",
          data: {
              ...input.data,
              amount: input.amount,
              currency_code: input.currency_code
          }
      }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    try {
      const paymentData = (input.data || {}) as MercadoPagoPaymentData;
      const context = (input.context || {}) as unknown as MedusaPaymentContext;

      // Use trusted amount from session data (stored by initiate/update)
      const amount = convertToDecimal(paymentData.amount || 0);
      const sessionId = paymentData.sessionId;

      if (!sessionId) {
          throw new Error("Session ID missing in payment data");
      }

      const { email } = context.customer || {};

      const payload: any = {
        transaction_amount: amount,
        description: `Order ${context.idempotency_key || sessionId}`,
        external_reference: sessionId, // Critical for webhook reconciliation
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
        payload.issuer_id = paymentData.issuerId;
      }

      if (paymentData.identification) {
         payload.payer.identification = paymentData.identification;
      }

      if (this.options_.webhookUrl) {
          payload.notification_url = this.options_.webhookUrl;
      }

      const response = await this.paymentClient_.create({ body: payload });
      const mpPayment = response as any;

      let status: PaymentSessionStatus = "pending";
      if (mpPayment.status === "approved") {
        status = "authorized";
      } else if (mpPayment.status === "pending" || mpPayment.status === "in_process") {
        status = "pending";
      } else if (mpPayment.status === "rejected" || mpPayment.status === "cancelled") {
        status = "canceled";
      } else {
        status = "error";
      }

      const newData: Record<string, unknown> = {
        ...paymentData,
        externalId: mpPayment.id,
        status: mpPayment.status,
      };

      if (mpPayment.point_of_interaction?.transaction_data) {
          newData.qr_code = mpPayment.point_of_interaction.transaction_data.qr_code;
          newData.qr_code_base64 = mpPayment.point_of_interaction.transaction_data.qr_code_base64;
          newData.ticket_url = mpPayment.point_of_interaction.transaction_data.ticket_url;
      }

      return {
        data: newData,
        status
      };
    } catch (error: any) {
      this.logger_.error(`MercadoPago authorization error: ${error.message}`);
      return {
        data: { ...input.data, error: error.message },
        status: "error"
      };
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
      try {
          const id = input.data?.externalId as string;
          if (!id) return { data: input.data || {} };

          await this.paymentClient_.cancel({ id });
          return { data: { ...input.data, status: 'canceled' } };
      } catch (error: any) {
           return {
               data: { ...input.data, error: error.message }
           }
      }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
      try {
          const id = input.data?.externalId as string;
          if (id) {
             const response = await this.paymentClient_.capture({ id });
             return { data: { ...input.data, status: response.status } };
          }
          return { data: input.data || {} };
      } catch (error: any) {
           return {
               data: { ...input.data, error: error.message }
           }
      }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
      return { data: input.data || {} };
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
      const externalId = input.data?.externalId as string;
      if (!externalId) return { status: "pending", data: input.data || {} };

      try {
          const response = await this.paymentClient_.get({ id: externalId });
          const status = response.status;
          let medusaStatus: PaymentSessionStatus = "pending";

          switch (status) {
              case "approved": medusaStatus = "authorized"; break;
              case "pending":
              case "in_process": medusaStatus = "pending"; break;
              case "rejected":
              case "cancelled": medusaStatus = "canceled"; break;
              case "refunded":
              case "charged_back": medusaStatus = "requires_more"; break;
              default: medusaStatus = "pending";
          }
          return { status: medusaStatus, data: { ...input.data, status } };
      } catch (e) {
          return { status: "error", data: input.data || {} };
      }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
      try {
          const id = input.data?.externalId as string;
          const amount = convertToDecimal(input.amount);

          const response = await this.refundClient_.create({
              payment_id: id,
              body: { amount }
          });

          return { data: { ...input.data, refundId: response.id } };
      } catch (error: any) {
           return {
               data: { ...input.data, error: error.message }
           }
      }
  }

  async getWebhookActionAndData(data: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
      const { action, data: eventData } = data as any;
      const paymentId = eventData?.id;

      if (!paymentId) {
          return { action: "not_supported" };
      }

      try {
         const payment = await this.paymentClient_.get({ id: paymentId });

         if (payment.status === "approved") {
             return {
                 action: "captured", // Or authorized
                 data: {
                     session_id: payment.external_reference || "",
                     amount: convertFromDecimal(payment.transaction_amount!),
                 }
             };
         }

         return { action: "not_supported" };
      } catch (e) {
          return { action: "failed" };
      }
  }
}
