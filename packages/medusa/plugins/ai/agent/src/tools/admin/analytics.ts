import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";
import type { MedusaContainer } from "@medusajs/medusa";
import type { IOrderModuleService } from "@medusajs/framework/types";

export function getAdminAnalyticsTools(container: MedusaContainer) {
  return [
    tool(
      async ({ days = 30 }: { days?: number }) => {
        try {
          const orderModule: IOrderModuleService = container.resolve(Modules.ORDER);

          const date = new Date();
          date.setDate(date.getDate() - days);

          const [orders] = await orderModule.listAndCountOrders({
            created_at: { $gt: date.toISOString() }
          }, { select: ["total", "currency_code", "created_at"] });

          const summary = orders.reduce((acc: Record<string, number>, order: any) => {
            const currency = order.currency_code?.toUpperCase() || "UNKNOWN";
            const orderTotal = typeof order.total === 'number' ? order.total : parseFloat(order.total?.toString() || "0");
            acc[currency] = (acc[currency] || 0) + orderTotal;
            return acc;
          }, {});

          return JSON.stringify({
            period: `Last ${days} days`,
            order_count: orders.length,
            revenue_by_currency: summary
          });
        } catch (e) {
          return `Error calculating sales summary: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_sales_summary",
        description: "Get sales summary (revenue) for the last X days.",
        schema: z.object({
          days: z.number().min(1).max(365).optional().default(30),
        }),
      }
    ),
    tool(
      async ({ limit = 5 }: { limit?: number }) => {
        try {
           const orderModule: IOrderModuleService = container.resolve(Modules.ORDER);

           // Fetch recent orders (e.g. last 100) to aggregate top products
           // Note: Production analytics should use a dedicated analytics engine or SQL query.
           const [orders] = await orderModule.listAndCountOrders({}, {
             take: 50,
             relations: ["items"]
           });

           const productCounts: Record<string, { title: string, count: number }> = {};

           orders.forEach((order: { items?: any[] }) => {
             const items = order.items;
             if (items) {
               items.forEach((item: any) => {
                 const productId = item.product_id || "unknown";
                 if (!productCounts[productId]) {
                   productCounts[productId] = { title: item.product_title || item.title || "Unknown", count: 0 };
                 }
                 productCounts[productId].count += item.quantity || 1;
               });
             }
           });

           const sorted = Object.values(productCounts)
             .sort((a, b) => b.count - a.count)
             .slice(0, limit);

           return JSON.stringify(sorted);
        } catch (e) {
          return `Error fetching top products: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_top_products",
        description: "Get top selling products based on recent orders.",
        schema: z.object({
          limit: z.number().optional().default(5),
        }),
      }
    )
  ];
}
