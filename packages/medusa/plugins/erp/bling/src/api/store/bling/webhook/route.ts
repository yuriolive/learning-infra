import { syncInventoryFromWebhookWorkflow } from "../../../../workflows/webhook/sync-inventory-from-webhook.js";
import { syncOrderFromWebhookWorkflow } from "../../../../workflows/webhook/sync-order-from-webhook.js";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export const POST = async (
  request: MedusaRequest,
  response: MedusaResponse,
) => {
  // Bling webhooks usually send data in body.
  // Logic to handle stock updates or order status updates.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = request.body as Record<string, any>;
  const type = body?.type;
  const logger = request.scope.resolve("logger");

  try {
    if (type === "stock") {
      // Trigger inventory sync workflow
      await syncInventoryFromWebhookWorkflow(request.scope).run({
        input: { payload: body },
      });
      logger.info("Successfully processed Bling stock webhook");
    } else if (type === "order") {
      // Trigger order status update
      await syncOrderFromWebhookWorkflow(request.scope).run({
        input: { payload: body },
      });
      logger.info("Successfully processed Bling order webhook");
    } else {
      logger.debug(
        `Received unknown or missing type in Bling webhook: ${type}`,
      );
    }
  } catch (error) {
    logger.error(`Error processing Bling webhook: ${error}`);
    // We still return 200 OK to prevent retries from Bling if it's our internal processing error
  }

  // Currently acknowledging to prevent retries from Bling.
  response.status(200).send("OK");
};
