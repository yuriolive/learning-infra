import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";

import type { IProductModuleService } from "@medusajs/framework/types";
import type { MedusaContainer } from "@medusajs/medusa";

// Interface for variant with optional calculated price
interface VariantWithPrice {
  calculated_price?: {
    calculated_amount: number;
    currency_code: string;
  };
}

export function getStoreTools(container: MedusaContainer) {
  return [
    tool(
      async ({ query }: { query: string }) => {
        try {
          const productModuleService: IProductModuleService = container.resolve(
            Modules.PRODUCT,
          );

          const [products] = await productModuleService.listAndCountProducts(
            {
              q: query,
              status: "published",
            },
            {
              take: 5, // Limit results for token efficiency
              relations: ["variants"],
            },
          );

          if (products.length === 0) {
            return JSON.stringify([]);
          }

          // Note: Price retrieval in Medusa v2 without Pricing Module context is limited.
          // We attempt to find 'calculated_price' on variants if available, otherwise return "Price on request".

          const mapped = products.map((p) => {
            const lowestPricesByCurrency = new Map<string, number>();

            if (p.variants) {
              for (const v of p.variants) {
                // Safely cast to access potential calculated_price
                const variant = v as unknown as VariantWithPrice;

                // check calculated_price
                if (variant.calculated_price?.calculated_amount) {
                  const { calculated_amount, currency_code } =
                    variant.calculated_price;
                  const code = currency_code.toUpperCase();
                  const currentLowest = lowestPricesByCurrency.get(code);

                  if (
                    currentLowest === undefined ||
                    calculated_amount < currentLowest
                  ) {
                    lowestPricesByCurrency.set(code, calculated_amount);
                  }
                }
              }
            }

            const price_display =
              lowestPricesByCurrency.size === 0
                ? "Price on request"
                : [...lowestPricesByCurrency.entries()]
                    .map(([code, amount]) => `${code} ${amount}`)
                    .join(" / ");

            return {
              id: p.id,
              title: p.title,
              handle: p.handle,
              price_display,
            };
          });

          return JSON.stringify(mapped);
        } catch (error) {
          return `Error: Failed to search products. ${(error as Error).message}`;
        }
      },
      {
        name: "search_products",
        description:
          "Search for products in the store by query string (e.g. 'red shoes'). Returns ID, Title, Handle, and Price.",
        schema: z.object({
          query: z.string().describe("The search term"),
        }),
      },
    ),
  ];
}
