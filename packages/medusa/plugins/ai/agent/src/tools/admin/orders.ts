import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";
import type { MedusaContainer } from "@medusajs/medusa";
import type { IOrderModuleService } from "@medusajs/framework/types";

export function getAdminOrderTools(container: MedusaContainer) {
  return [
    tool(
      async ({ status, limit = 5 }: { status?: string; limit?: number }) => {
        try {
          const orderModule: IOrderModuleService = container.resolve(Modules.ORDER);
          const filters: any = {};
          if (status) {
            filters.status = status;
          }
          const [orders, count] = await orderModule.listAndCountOrders(filters, {
            take: limit,
            order: { created_at: "DESC" },
            relations: ["items"]
          });
          return JSON.stringify({ count, orders });
        } catch (e) {
          return `Error listing orders: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_list_orders",
        description: "List recent orders with optional status filter.",
        schema: z.object({
          status: z.enum(["pending", "completed", "canceled", "requires_action"]).optional(),
          limit: z.number().min(1).max(100).optional().default(5),
        }),
      }
    ),
    tool(
      async ({ order_id }: { order_id: string }) => {
        try {
          const orderModule: IOrderModuleService = container.resolve(Modules.ORDER);

          // For now, let's return order details so the agent can see what needs fulfilling.
          const order = await orderModule.retrieveOrder(order_id, { relations: ["items"] });
          return JSON.stringify({ message: "Order details for fulfillment", order });

        } catch (e) {
          return `Error accessing order: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_fulfill_order_details",
        description: "Retrieve order details required to perform fulfillment (Shipping address, items).",
        schema: z.object({
          order_id: z.string(),
        }),
      }
    ),
    tool(
      async ({ order_id }: { order_id: string }) => {
        try {
          const orderModule: IOrderModuleService = container.resolve(Modules.ORDER);
          await orderModule.cancel(order_id);
          return `Order ${order_id} has been canceled.`;
        } catch (e) {
          return `Error canceling order: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_cancel_order",
        description: "Cancel an order by ID.",
        schema: z.object({
          order_id: z.string(),
        }),
      }
    )
  ];
}
