import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export const POST = (request: MedusaRequest, response: MedusaResponse) => {
  // Bling webhooks usually send data in body.
  // Logic to handle stock updates or order status updates.

  // Example: Check headers or body type
  const body = request.body as unknown as { type?: string } | undefined;
  const type = body?.type;

  if (type === "stock") {
    // Trigger inventory sync workflow
    // await syncInventoryWorkflow(req.scope).run({ input: req.body });
  } else if (type === "order") {
    // Trigger order status update
  }

  // TODO: Implement full webhook processing logic with workflows.
  // Currently acknowledging to prevent retries from Bling.

  response.status(200).send("OK");
};
