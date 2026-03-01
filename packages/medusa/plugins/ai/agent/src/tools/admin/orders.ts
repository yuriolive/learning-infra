import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";

import type {
  FilterableOrderProps,
  IOrderModuleService,
} from "@medusajs/framework/types";
import type { MedusaContainer } from "@medusajs/medusa";

export function getAdminOrderTools(container: MedusaContainer) {
  return [
    tool(
      async ({ status, limit = 5 }: { status?: string; limit?: number }) => {
        try {
          const orderModule: IOrderModuleService = container.resolve(
            Modules.ORDER,
          );
          const filters = (status
            ? { status }
            : {}) as unknown as FilterableOrderProps;
          const [orders, count] = await orderModule.listAndCountOrders(
            filters,
            {
              take: limit,
              order: { created_at: "DESC" },
              relations: ["items"],
            },
          );
          return JSON.stringify({ count, orders });
        } catch (error) {
          return `Error listing orders: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_list_orders",
        description: "List recent orders with optional status filter.",
        schema: z.object({
          status: z
            .enum(["pending", "completed", "canceled", "requires_action"])
            .optional(),
          limit: z.number().min(1).max(100).optional().default(5),
        }),
      },
    ),
    tool(
      async ({ order_id }: { order_id: string }) => {
        try {
          const orderModule: IOrderModuleService = container.resolve(
            Modules.ORDER,
          );

          // For now, let's return order details so the agent can see what needs fulfilling.
          const order = await orderModule.retrieveOrder(order_id, {
            relations: ["items"],
          });
          return JSON.stringify({
            message: "Order details for fulfillment",
            order,
          });
        } catch (error) {
          return `Error accessing order: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_fulfill_order_details",
        description:
          "Retrieve order details required to perform fulfillment (Shipping address, items).",
        schema: z.object({
          order_id: z.string(),
        }),
      },
    ),
    tool(
      async ({ order_id }: { order_id: string }) => {
        try {
          const orderModule: IOrderModuleService = container.resolve(
            Modules.ORDER,
          );
          await orderModule.cancel(order_id);
          return `Order ${order_id} has been canceled.`;
        } catch (error) {
          return `Error canceling order: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_cancel_order",
        description: "Cancel an order by ID.",
        schema: z.object({
          order_id: z.string(),
        }),
      },
    ),
  ];
}
