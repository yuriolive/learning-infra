import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    // Bling webhooks usually send data in body.
    // Logic to handle stock updates or order status updates.
    // For MVP we just acknowledge.

    // We would parse the type of webhook (stock update vs order update) and trigger relevant workflows.
    // E.g. if type == 'stock', trigger updateInventoryStep (wrapped in a workflow).

    res.status(200).send("OK");
};
