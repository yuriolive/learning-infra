import type { PaymentSessionStatus } from "@medusajs/types";

export const mapMercadoPagoStatus = (status: string): PaymentSessionStatus => {
  switch (status) {
    case "approved": {
      return "authorized";
    }
    case "pending":
    case "in_process": {
      return "pending";
    }
    case "rejected":
    case "cancelled": {
      return "canceled";
    }
    case "refunded":
    case "charged_back": {
      return "requires_more";
    }
    default: {
      return "pending";
    }
  }
};
