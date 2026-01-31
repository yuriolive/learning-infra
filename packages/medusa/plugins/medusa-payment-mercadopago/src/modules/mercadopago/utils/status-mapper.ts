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
    case "cancelled":
    case "refunded":
    case "charged_back": {
      return "canceled";
    }
    default: {
      return "pending";
    }
  }
};
