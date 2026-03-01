import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";
import type { MedusaContainer } from "@medusajs/medusa";
import type { IProductModuleService } from "@medusajs/framework/types";

export function getAdminProductTools(container: MedusaContainer) {
  return [
    tool(
      async ({ status, limit = 10 }: { status?: string; limit?: number }) => {
        try {
          const productModule: IProductModuleService = container.resolve(Modules.PRODUCT);
          const filters: any = {};
          if (status) {
            filters.status = status;
          }
          const [products, count] = await productModule.listAndCountProducts(filters, {
            take: limit,
            select: ["id", "title", "handle", "status", "variants.id", "variants.title"],
            relations: ["variants"],
          });
          return JSON.stringify({ count, products });
        } catch (e) {
          return `Error listing products: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_list_products",
        description: "List products in the store with optional status filter.",
        schema: z.object({
          status: z.enum(["published", "draft", "proposed", "rejected"]).optional(),
          limit: z.number().min(1).max(100).optional().default(10).describe("Max number of records to return (default 10)"),
        }),
      }
    ),
    tool(
      async ({ title, options }: { title: string; options?: Record<string, any> }) => {
        try {
          const productModule: IProductModuleService = container.resolve(Modules.PRODUCT);
          // Basic product creation. In a real scenario, this would likely involve a workflow for prices/inventory.
          const product = await productModule.createProducts([{
            title,
            status: "draft",
            ...options,
          }]);
          return JSON.stringify(product);
        } catch (e) {
          return `Error creating product: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_create_product",
        description: "Create a new product (defaults to draft status).",
        schema: z.object({
          title: z.string(),
          options: z.object({
            description: z.string().optional(),
            handle: z.string().optional(),
            subtitle: z.string().optional(),
          }).optional().describe("Additional product options like description, handle, etc."),
        }),
      }
    ),
    tool(
      async ({ id, update_data }: { id: string; update_data: Record<string, any> }) => {
        try {
          const productModule: IProductModuleService = container.resolve(Modules.PRODUCT);
          const product = await productModule.updateProducts(id, update_data as any);
          return JSON.stringify(product);
        } catch (e) {
          return `Error updating product: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_update_product",
        description: "Update an existing product's attributes.",
        schema: z.object({
          id: z.string(),
          update_data: z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            handle: z.string().optional(),
            status: z.enum(["published", "draft", "proposed", "rejected"]).optional(),
          }).describe("Key-value pairs of attributes to update (e.g., { title: 'New Name' })"),
        }),
      }
    ),
    tool(
      async ({ id }: { id: string }) => {
        try {
          const productModule: IProductModuleService = container.resolve(Modules.PRODUCT);
          await productModule.deleteProducts([id]);
          return `Product ${id} deleted successfully.`;
        } catch (e) {
          return `Error deleting product: ${(e as Error).message}`;
        }
      },
      {
        name: "admin_delete_product",
        description: "Soft delete a product by ID.",
        schema: z.object({
          id: z.string(),
        }),
      }
    ),
  ];
}
