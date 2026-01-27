import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import { Logger, AuthorizePaymentInput, AuthorizePaymentOutput, CapturePaymentInput, CapturePaymentOutput, RefundPaymentInput, RefundPaymentOutput, CancelPaymentInput, CancelPaymentOutput, DeletePaymentInput, DeletePaymentOutput, GetPaymentStatusInput, GetPaymentStatusOutput, InitiatePaymentInput, InitiatePaymentOutput, RetrievePaymentInput, RetrievePaymentOutput, UpdatePaymentInput, UpdatePaymentOutput, ProviderWebhookPayload, WebhookActionResult } from "@medusajs/types";
import { MercadoPagoConfig, Payment, PaymentRefund } from "mercadopago";
type MercadoPagoOptions = {
    accessToken: string;
    webhookSecret?: string;
    webhookUrl?: string;
};
export default class MercadoPagoPaymentProviderService extends AbstractPaymentProvider {
    static identifier: string;
    protected config_: MercadoPagoConfig;
    protected paymentClient_: Payment;
    protected refundClient_: PaymentRefund;
    protected options_: MercadoPagoOptions;
    protected logger_: Logger;
    constructor(container: {
        logger: Logger;
    }, options: MercadoPagoOptions);
    initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput>;
    retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput>;
    updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput>;
    authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput>;
    cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput>;
    capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput>;
    deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput>;
    getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput>;
    refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput>;
    getWebhookActionAndData(data: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult>;
}
export {};
//# sourceMappingURL=service.d.ts.map