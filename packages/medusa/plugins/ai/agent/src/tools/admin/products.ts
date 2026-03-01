import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";

import type {
  FilterableProductProps,
  IProductModuleService,
  UpdateProductDTO,
} from "@medusajs/framework/types";
import type { MedusaContainer } from "@medusajs/medusa";

export function getAdminProductTools(container: MedusaContainer) {
  return [
    tool(
      async ({ status, limit = 10 }: { status?: string; limit?: number }) => {
        try {
          const productModule: IProductModuleService = container.resolve(
            Modules.PRODUCT,
          );
          const filters = (status
            ? { status }
            : {}) as unknown as FilterableProductProps;
          const [products, count] = await productModule.listAndCountProducts(
            filters,
            {
              take: limit,
              select: [
                "id",
                "title",
                "handle",
                "status",
                "variants.id",
                "variants.title",
              ],
              relations: ["variants"],
            },
          );
          return JSON.stringify({ count, products });
        } catch (error) {
          return `Error listing products: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_list_products",
        description: "List products in the store with optional status filter.",
        schema: z.object({
          status: z
            .enum(["published", "draft", "proposed", "rejected"])
            .optional(),
          limit: z
            .number()
            .min(1)
            .max(100)
            .optional()
            .default(10)
            .describe("Max number of records to return (default 10)"),
        }),
      },
    ),
    tool(
      async ({
        title,
        options,
      }: {
        title: string;
        options?: { description?: string; handle?: string; subtitle?: string };
      }) => {
        try {
          const productModule: IProductModuleService = container.resolve(
            Modules.PRODUCT,
          );
          // Basic product creation. In a real scenario, this would likely involve a workflow for prices/inventory.
          const product = await productModule.createProducts([
            {
              title,
              status: "draft",
              ...options,
            },
          ]);
          return JSON.stringify(product);
        } catch (error) {
          return `Error creating product: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_create_product",
        description: "Create a new product (defaults to draft status).",
        schema: z.object({
          title: z.string(),
          options: z
            .object({
              description: z.string().optional(),
              handle: z.string().optional(),
              subtitle: z.string().optional(),
            })
            .optional()
            .describe(
              "Additional product options like description, handle, etc.",
            ),
        }),
      },
    ),
    tool(
      async ({
        id,
        update_data,
      }: {
        id: string;
        update_data: UpdateProductDTO;
      }) => {
        try {
          const productModule: IProductModuleService = container.resolve(
            Modules.PRODUCT,
          );
          const product = await productModule.updateProducts(id, update_data);
          return JSON.stringify(product);
        } catch (error) {
          return `Error updating product: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_update_product",
        description: "Update an existing product's attributes.",
        schema: z.object({
          id: z.string(),
          update_data: z
            .object({
              title: z.string().optional(),
              description: z.string().optional(),
              handle: z.string().optional(),
              status: z
                .enum(["published", "draft", "proposed", "rejected"])
                .optional(),
            })
            .describe(
              "Key-value pairs of attributes to update (e.g., { title: 'New Name' })",
            ),
        }),
      },
    ),
    tool(
      async ({ id }: { id: string }) => {
        try {
          const productModule: IProductModuleService = container.resolve(
            Modules.PRODUCT,
          );
          await productModule.deleteProducts([id]);
          return `Product ${id} deleted successfully.`;
        } catch (error) {
          return `Error deleting product: ${(error as Error).message}`;
        }
      },
      {
        name: "admin_delete_product",
        description: "Soft delete a product by ID.",
        schema: z.object({
          id: z.string(),
        }),
      },
    ),
  ];
}
