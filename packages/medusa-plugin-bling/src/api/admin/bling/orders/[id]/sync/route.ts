import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { syncOrderToBlingWorkflow } from "../../../../../workflows/sync-order.js";

const schema = z.object({
  generateNfe: z.boolean().optional(),
  generateShippingLabel: z.boolean().optional(),
});

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params;
  const body = schema.parse(req.body);

  try {
    const { result, transaction } = await syncOrderToBlingWorkflow(req.scope).run({
        input: {
            orderId: id,
            options: body
        }
    });

    res.json({
        message: "Order sync started",
        result,
        transaction_id: transaction.transactionId
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
