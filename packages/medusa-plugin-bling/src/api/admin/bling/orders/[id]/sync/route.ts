import { z } from "zod";

import { syncOrderToBlingWorkflow } from "../../../../../../workflows/sync-order.js";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const schema = z.object({
  generateNfe: z.boolean().optional(),
  generateShippingLabel: z.boolean().optional(),
});

export const POST = async (
  request: MedusaRequest,
  response: MedusaResponse,
) => {
  const { id } = request.params;
  const body = schema.parse(request.body);

  try {
    const { result, transaction } = await syncOrderToBlingWorkflow(
      request.scope,
    ).run({
      input: {
        orderId: id as string,
        options: body,
      },
    });

    response.json({
      message: "Order sync started",
      result,
      transaction_id: transaction.transactionId,
    });
  } catch (error: any) {
    response.status(500).json({ message: error.message });
  }
};
