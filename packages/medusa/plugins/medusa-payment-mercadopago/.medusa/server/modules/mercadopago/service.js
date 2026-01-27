import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import { MercadoPagoConfig, Payment, PaymentRefund } from "mercadopago";
import { convertToDecimal, convertFromDecimal } from "./utils/index.js";
import { randomUUID } from "node:crypto";
export default class MercadoPagoPaymentProviderService extends AbstractPaymentProvider {
    static identifier = "mercadopago";
    config_;
    paymentClient_;
    refundClient_;
    options_;
    logger_;
    constructor(container, options) {
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
    async initiatePayment(input) {
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
        };
    }
    async retrievePayment(input) {
        return {
            data: input.data || {}
        };
    }
    async updatePayment(input) {
        return {
            status: "pending",
            data: {
                ...input.data,
                amount: input.amount,
                currency_code: input.currency_code
            }
        };
    }
    async authorizePayment(input) {
        try {
            const paymentData = (input.data || {});
            const context = (input.context || {});
            // Use trusted amount from session data (stored by initiate/update)
            const amount = convertToDecimal(paymentData.amount || 0);
            const sessionId = paymentData.sessionId;
            if (!sessionId) {
                throw new Error("Session ID missing in payment data");
            }
            const { email } = context.customer || {};
            const payload = {
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
            const mpPayment = response;
            let status = "pending";
            if (mpPayment.status === "approved") {
                status = "authorized";
            }
            else if (mpPayment.status === "pending" || mpPayment.status === "in_process") {
                status = "pending";
            }
            else if (mpPayment.status === "rejected" || mpPayment.status === "cancelled") {
                status = "canceled";
            }
            else {
                status = "error";
            }
            const newData = {
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
        }
        catch (error) {
            this.logger_.error(`MercadoPago authorization error: ${error.message}`);
            return {
                data: { ...input.data, error: error.message },
                status: "error"
            };
        }
    }
    async cancelPayment(input) {
        try {
            const id = input.data?.externalId;
            if (!id)
                return { data: input.data || {} };
            await this.paymentClient_.cancel({ id });
            return { data: { ...input.data, status: 'canceled' } };
        }
        catch (error) {
            return {
                data: { ...input.data, error: error.message }
            };
        }
    }
    async capturePayment(input) {
        try {
            const id = input.data?.externalId;
            if (id) {
                const response = await this.paymentClient_.capture({ id });
                return { data: { ...input.data, status: response.status } };
            }
            return { data: input.data || {} };
        }
        catch (error) {
            return {
                data: { ...input.data, error: error.message }
            };
        }
    }
    async deletePayment(input) {
        return { data: input.data || {} };
    }
    async getPaymentStatus(input) {
        const externalId = input.data?.externalId;
        if (!externalId)
            return { status: "pending", data: input.data || {} };
        try {
            const response = await this.paymentClient_.get({ id: externalId });
            const status = response.status;
            let medusaStatus = "pending";
            switch (status) {
                case "approved":
                    medusaStatus = "authorized";
                    break;
                case "pending":
                case "in_process":
                    medusaStatus = "pending";
                    break;
                case "rejected":
                case "cancelled":
                    medusaStatus = "canceled";
                    break;
                case "refunded":
                case "charged_back":
                    medusaStatus = "requires_more";
                    break;
                default: medusaStatus = "pending";
            }
            return { status: medusaStatus, data: { ...input.data, status } };
        }
        catch (e) {
            return { status: "error", data: input.data || {} };
        }
    }
    async refundPayment(input) {
        try {
            const id = input.data?.externalId;
            const amount = convertToDecimal(input.amount);
            const response = await this.refundClient_.create({
                payment_id: id,
                body: { amount }
            });
            return { data: { ...input.data, refundId: response.id } };
        }
        catch (error) {
            return {
                data: { ...input.data, error: error.message }
            };
        }
    }
    async getWebhookActionAndData(data) {
        const { action, data: eventData } = data;
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
                        amount: convertFromDecimal(payment.transaction_amount),
                    }
                };
            }
            return { action: "not_supported" };
        }
        catch (e) {
            return { action: "failed" };
        }
    }
}
//# sourceMappingURL=service.js.map