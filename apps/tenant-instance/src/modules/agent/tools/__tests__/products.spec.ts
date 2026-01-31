import { Modules } from "@medusajs/framework/utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { getStoreTools } from "../products";

describe("Product Tools", () => {
  const mockProductService = {
    listAndCountProducts: vi.fn(),
  };

  const mockContainer = {
    resolve: vi.fn((key) => {
      if (key === Modules.PRODUCT) return mockProductService;
      return {};
    }),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = getStoreTools(mockContainer as any);
  const searchTool = tools.find((t) => t.name === "search_products");

  if (!searchTool) {
    throw new Error("search_products tool not found");
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should search products and return formatted JSON", async () => {
    mockProductService.listAndCountProducts.mockResolvedValue([
      [
        {
          id: "prod_1",
          title: "Red Shoes",
          handle: "red-shoes",
          variants: [
            {
              id: "var_1",
              calculated_price: {
                calculated_amount: 50,
                currency_code: "brl",
              },
            },
            {
              id: "var_2",
              calculated_price: {
                calculated_amount: 100,
                currency_code: "brl",
              },
            },
          ],
        },
      ],
      1,
    ]);

    const result = await searchTool.invoke({ query: "red" });
    const parsed = JSON.parse(result);

    expect(mockProductService.listAndCountProducts).toHaveBeenCalledWith(
      { q: "red", status: "published" },
      expect.objectContaining({ take: 5, relations: ["variants"] }),
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      id: "prod_1",
      title: "Red Shoes",
      handle: "red-shoes",
      price_display: "BRL 50",
    });
  });

  it("should return empty array if no products found", async () => {
    mockProductService.listAndCountProducts.mockResolvedValue([[], 0]);

    const result = await searchTool.invoke({ query: "blue" });
    expect(result).toBe("[]");
  });

  it("should handle products without prices", async () => {
    mockProductService.listAndCountProducts.mockResolvedValue([
      [
        {
          id: "prod_2",
          title: "Free Item",
          handle: "free-item",
          variants: [{ id: "v1" }], // No calculated_price
        },
      ],
      1,
    ]);

    const result = await searchTool.invoke({ query: "free" });
    const parsed = JSON.parse(result);

    expect(parsed[0].price_display).toBe("Price on request");
  });
});
