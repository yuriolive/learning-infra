import type { BigNumberInput } from "@medusajs/types";

export interface MercadoPagoOptions extends Record<string, unknown> {
  accessToken: string;
  webhookSecret?: string;
  webhookUrl?: string;
}

export interface MercadoPagoPaymentData extends Record<string, unknown> {
  sessionId?: string;
  amount?: BigNumberInput;
  paymentMethodId?: string;
  installments?: number;
  token?: string;
  issuerId?: string | number;
  identification?: {
    type: string;
    number: string;
  };
  externalId?: string;
}

export interface MedusaPaymentContext {
  customer?: {
    email?: string;
  };
  idempotency_key?: string;
}

export interface MercadoPagoPaymentRequest {
  transaction_amount: number;
  description: string;
  external_reference: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  payment_method_id?: string;
  installments: number;
  token?: string;
  issuer_id?: number;
  notification_url?: string;
}

export interface MercadoPagoPaymentResponse {
  id: string;
  status: string;
  external_reference?: string;
  transaction_amount?: number;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}
