import { syncProductsFromBlingWorkflow } from "../../../../../workflows/sync-products.js";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export const POST = async (
  request: MedusaRequest,
  response: MedusaResponse,
) => {
  try {
    const { result, transaction } = await syncProductsFromBlingWorkflow(
      request.scope,
    ).run();
    response.json({
      message: "Product sync started",
      result,
      transaction_id: transaction.transactionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generic error";
    response.status(500).json({ message });
  }
};
