import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { syncProductsFromBlingWorkflow } from "../../../../workflows/sync-products.js";

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { result, transaction } = await syncProductsFromBlingWorkflow(req.scope).run();
    res.json({
        message: "Product sync started",
        result,
        transaction_id: transaction.transactionId
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
