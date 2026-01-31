import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";

import type {
  ICartModuleService,
  IRegionModuleService,
  IProductModuleService,
  ICustomerModuleService,
  IPricingModuleService,
} from "@medusajs/framework/types";
import type { MedusaContainer } from "@medusajs/medusa";

// Extend CartDTO locally to include completed_at which is present in runtime but might be missing in strict DTOs
interface ExtendedCart {
  id: string;
  completed_at?: Date | string | null;
}

export function getCartTools(container: MedusaContainer) {
  return [getGetOrCreateCartTool(container), getAddItemToCartTool(container)];
}

function getGetOrCreateCartTool(container: MedusaContainer) {
  return tool(
    async ({ customer_id }: { customer_id: string }) => {
      try {
        const cartModule: ICartModuleService = container.resolve(Modules.CART);
        const regionModule: IRegionModuleService = container.resolve(
          Modules.REGION,
        );
        const customerModule: ICustomerModuleService = container.resolve(
          Modules.CUSTOMER,
        );

        // Get default region
        const [regions] = await regionModule.listAndCountRegions(
          {},
          { take: 1 },
        );

        if (regions.length === 0) {
          throw new Error("Store not configured: No regions found.");
        }

        const defaultRegion = regions[0];

        // Try to find active cart for customer
        const carts = await cartModule.listCarts(
          {
            customer_id,
          },
          {
            take: 5, // Fetch a few to find an active one
            order: { created_at: "DESC" },
          },
        );

        // Filter for active cart (not completed)
        // We cast to unknown then ExtendedCart to safely access completed_at without 'any'
        const activeCart = carts.find((c) => {
          const cart = c as unknown as ExtendedCart;
          return !cart.completed_at;
        });

        if (activeCart) {
          return activeCart.id;
        }

        // Fetch customer to get email
        const customer = await customerModule
          .retrieveCustomer(customer_id)
          .catch(() => null);
        const email = customer?.email || `${customer_id}@example.com`;

        // Create new cart
        const newCart = await cartModule.createCarts({
          customer_id,
          region_id: defaultRegion.id,
          currency_code: defaultRegion.currency_code,
          email,
        });

        return newCart.id;
      } catch (error) {
        return `Error: ${(error as Error).message}`;
      }
    },
    {
      name: "get_or_create_cart",
      description: "Get an existing cart or create a new one for a customer.",
      schema: z.object({
        customer_id: z.string().describe("The ID of the customer"),
      }),
    },
  );
}

function getAddItemToCartTool(container: MedusaContainer) {
  return tool(
    async ({
      cart_id,
      variant_id,
      quantity,
    }: {
      cart_id: string;
      quantity: number;
      variant_id: string;
    }) => {
      try {
        const cartModule: ICartModuleService = container.resolve(Modules.CART);
        const productModule: IProductModuleService = container.resolve(
          Modules.PRODUCT,
        );
        const pricingModule: IPricingModuleService = container.resolve(
          Modules.PRICING,
        );

        // Fetch variant to get title (price comes from pricing module)
        const [variants] = await productModule.listAndCountProductVariants(
          {
            id: variant_id,
          },
          {
            take: 1,
          },
        );

        if (variants.length === 0) {
          throw new Error(`Variant ${variant_id} not found.`);
        }

        const variant = variants[0];

        // Fetch cart to get currency and region context
        const cart = await cartModule.retrieveCart(cart_id);

        if (!cart.region_id || !cart.currency_code) {
          throw new Error(
            `Cart ${cart_id} is missing region or currency context.`,
          );
        }

        // Calculate price
        const priceSet = await pricingModule.calculatePrices(
          { id: [variant_id] },
          {
            context: {
              currency_code: cart.currency_code,
              region_id: cart.region_id,
            },
          },
        );

        const calculatedPrice = priceSet[0]?.calculated_amount;

        if (calculatedPrice === undefined || calculatedPrice === null) {
          throw new Error(
            `Could not determine price for variant ${variant_id}`,
          );
        }

        await cartModule.addLineItems(cart_id, [
          {
            variant_id,
            quantity,
            title: variant.title,
            unit_price: calculatedPrice,
          },
        ]);

        return "Item added to cart successfully.";
      } catch (error) {
        return `Error: Failed to add item. ${(error as Error).message}`;
      }
    },
    {
      name: "add_item_to_cart",
      description: "Add a product variant to the cart.",
      schema: z.object({
        cart_id: z.string(),
        variant_id: z.string(),
        quantity: z.number(),
      }),
    },
  );
}
