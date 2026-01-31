import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCartTools } from "../cart";
import { Modules } from "@medusajs/framework/utils";

describe("Cart Tools", () => {
  const mockCartService = {
    listCarts: vi.fn(),
    createCarts: vi.fn(),
    addLineItems: vi.fn(),
  };

  const mockRegionService = {
    listAndCountRegions: vi.fn(),
  };

  const mockProductService = {
    listAndCountProductVariants: vi.fn(),
  };

  const mockContainer = {
    resolve: vi.fn((key) => {
      if (key === Modules.CART) return mockCartService;
      if (key === Modules.REGION) return mockRegionService;
      if (key === Modules.PRODUCT) return mockProductService;
      return {};
    }),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = getCartTools(mockContainer as any);
  const getOrCreateTool = tools.find((t) => t.name === "get_or_create_cart")!;
  const addItemTool = tools.find((t) => t.name === "add_item_to_cart")!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("get_or_create_cart", () => {
    it("should return existing cart id", async () => {
      mockRegionService.listAndCountRegions.mockResolvedValue([[{ id: "reg_1" }], 1]);
      mockCartService.listCarts.mockResolvedValue([{ id: "cart_existing" }]);

      const result = await getOrCreateTool.invoke({ customer_id: "cus_1" });

      expect(mockCartService.listCarts).toHaveBeenCalledWith(
        { customer_id: "cus_1" },
        expect.objectContaining({ take: 5 })
      );
      expect(result).toBe("cart_existing");
      expect(mockCartService.createCarts).not.toHaveBeenCalled();
    });

    it("should create new cart if none exists", async () => {
      mockRegionService.listAndCountRegions.mockResolvedValue([[{ id: "reg_1" }], 1]);
      mockCartService.listCarts.mockResolvedValue([]);
      mockCartService.createCarts.mockResolvedValue({ id: "cart_new" });

      const result = await getOrCreateTool.invoke({ customer_id: "cus_1" });

      expect(mockCartService.createCarts).toHaveBeenCalledWith(expect.objectContaining({
        customer_id: "cus_1",
        region_id: "reg_1",
        currency_code: "brl",
      }));
      expect(result).toBe("cart_new");
    });

    it("should ignore completed carts and create new one", async () => {
      mockRegionService.listAndCountRegions.mockResolvedValue([[{ id: "reg_1" }], 1]);
      mockCartService.listCarts.mockResolvedValue([
          { id: "cart_completed", completed_at: new Date() }
      ]);
      mockCartService.createCarts.mockResolvedValue({ id: "cart_new" });

      const result = await getOrCreateTool.invoke({ customer_id: "cus_1" });

      expect(result).toBe("cart_new");
    });

    it("should throw error if no regions", async () => {
      mockRegionService.listAndCountRegions.mockResolvedValue([[], 0]);

      const result = await getOrCreateTool.invoke({ customer_id: "cus_1" });
      expect(result).toContain("Error: Store not configured: No regions found");
    });
  });

  describe("add_item_to_cart", () => {
    it("should add item successfully", async () => {
        mockCartService.addLineItems.mockResolvedValue({});
        mockProductService.listAndCountProductVariants.mockResolvedValue([
            [{ id: "var_1", title: "Test Variant" }], 1
        ]);

        const result = await addItemTool.invoke({
            cart_id: "cart_1",
            variant_id: "var_1",
            quantity: 2
        });

        expect(mockProductService.listAndCountProductVariants).toHaveBeenCalledWith(
            { id: "var_1" }, { take: 1 }
        );

        expect(mockCartService.addLineItems).toHaveBeenCalledWith(
            "cart_1",
            [{ variant_id: "var_1", quantity: 2, title: "Test Variant", unit_price: 1000 }]
        );
        expect(result).toContain("Item added");
    });

    it("should handle error if variant not found", async () => {
        mockProductService.listAndCountProductVariants.mockResolvedValue([[], 0]);

        const result = await addItemTool.invoke({
            cart_id: "cart_1",
            variant_id: "var_1",
            quantity: 2
        });

        expect(result).toContain("Error: Failed to add item. Variant var_1 not found.");
    });

    it("should handle errors from cart service", async () => {
        mockProductService.listAndCountProductVariants.mockResolvedValue([
            [{ id: "var_1", title: "Test Variant" }], 1
        ]);
        mockCartService.addLineItems.mockRejectedValue(new Error("Out of stock"));

        const result = await addItemTool.invoke({
            cart_id: "cart_1",
            variant_id: "var_1",
            quantity: 2
        });

        expect(result).toContain("Error: Failed to add item. Out of stock");
    });
  });
});
