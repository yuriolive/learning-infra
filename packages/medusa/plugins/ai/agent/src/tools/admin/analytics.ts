import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";

import type {
  FilterableOrderProps,
  IOrderModuleService,
} from "@medusajs/framework/types";
import type { MedusaContainer } from "@medusajs/medusa";

interface OrderItem {
  product_id?: string;
  product_title?: string;
  title?: string;
  quantity?: number;
}

interface OrderWithItems {
  items?: OrderItem[];
}

export function getAdminAnalyticsTools(container: MedusaContainer) {
  return [
    tool(
      async ({ days = 30 }: { days?: number }) => {
        try {
          const orderModule: IOrderModuleService = container.resolve(
            Modules.ORDER,
          );

          const date = new Date();
          date.setDate(date.getDate() - days);

          const [orders] = await orderModule.listAndCountOrders(
            {
              created_at: { $gt: date.toISOString() },
            } as unknown as FilterableOrderProps,
            { select: ["total", "currency_code", "created_at"] },
          );

          const summary: Record<string, number> = {};
          for (const order of orders) {
            const currency = order.currency_code?.toUpperCase() ?? "UNKNOWN";
            const orderTotal = Number(order.total ?? 0);
            summary[currency] = (summary[currency] ?? 0) + orderTotal;
          }

          return JSON.stringify({
            period: `Last ${days} days`,
            order_count: orders.length,
            revenue_by_currency: summary,
          });
        } catch (error) {
          return `Error calculating sales summary: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_sales_summary",
        description: "Get sales summary (revenue) for the last X days.",
        schema: z.object({
          days: z.number().min(1).max(365).optional().default(30),
        }),
      },
    ),
    tool(
      async ({
        limit = 5,
        orders_to_scan = 100,
      }: {
        limit?: number;
        orders_to_scan?: number;
      }) => {
        try {
          const orderModule: IOrderModuleService = container.resolve(
            Modules.ORDER,
          );

          // Fetch recent orders to aggregate top products
          // Note: Production analytics should use a dedicated analytics engine or SQL query.
          const [orders] = await orderModule.listAndCountOrders(
            {},
            {
              take: orders_to_scan,
              relations: ["items"],
            },
          );

          const productCounts: Record<
            string,
            { title: string; count: number }
          > = {};

          (orders as unknown as OrderWithItems[]).forEach((order) => {
            const items = order.items;
            if (items) {
              items.forEach((item) => {
                if (!item.product_id) {
                  return; // Skip items without a product ID to avoid incorrect aggregation.
                }
                const productId = item.product_id;
                if (!productCounts[productId]) {
                  productCounts[productId] = {
                    title:
                      item.product_title ?? item.title ?? "Unknown Product",
                    count: 0,
                  };
                }
                productCounts[productId].count += item.quantity ?? 1;
              });
            }
          });

          const sorted = Object.values(productCounts)
            .toSorted((a, b) => b.count - a.count)
            .slice(0, limit);

          return JSON.stringify(sorted);
        } catch (error) {
          return `Error fetching top products: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_top_products",
        description: "Get top selling products based on recent orders.",
        schema: z.object({
          limit: z.number().optional().default(5),
          orders_to_scan: z
            .number()
            .min(10)
            .max(1000)
            .optional()
            .default(100)
            .describe("Number of recent orders to analyze."),
        }),
      },
    ),
  ];
}
