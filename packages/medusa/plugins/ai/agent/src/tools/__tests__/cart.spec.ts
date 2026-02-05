import { Modules } from "@medusajs/framework/utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { getCartTools } from "../cart.js";

interface MinimalTool {
  name: string;
  invoke: (input: Record<string, unknown>) => Promise<string>;
}

describe("Cart Tools", () => {
  const mockCartService = {
    listCarts: vi.fn(),
    createCarts: vi.fn(),
    addLineItems: vi.fn(),
    retrieveCart: vi.fn(),
  };

  const mockRegionService = {
    listAndCountRegions: vi.fn(),
  };

  const mockProductService = {
    listAndCountProductVariants: vi.fn(),
  };

  const mockCustomerService = {
    retrieveCustomer: vi.fn(),
  };

  const mockPricingService = {
    calculatePrices: vi.fn(),
  };

  const mockContainer = {
    resolve: vi.fn((key) => {
      if (key === Modules.CART) return mockCartService;
      if (key === Modules.REGION) return mockRegionService;
      if (key === Modules.PRODUCT) return mockProductService;
      if (key === Modules.CUSTOMER) return mockCustomerService;
      if (key === Modules.PRICING) return mockPricingService;
      return {};
    }),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = getCartTools(mockContainer as any) as unknown as MinimalTool[];
  const getOrCreateTool = tools.find((t) => t.name === "get_or_create_cart");
  const addItemTool = tools.find((t) => t.name === "add_item_to_cart");

  if (!getOrCreateTool) {
    throw new Error("get_or_create_cart tool not found");
  }

  if (!addItemTool) {
    throw new Error("add_item_to_cart tool not found");
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("get_or_create_cart", () => {
    const defaultRegion = { id: "reg_1", currency_code: "usd" };

    beforeEach(() => {
      mockRegionService.listAndCountRegions.mockResolvedValue([
        [defaultRegion],
        1,
      ]);
    });

    it("should return existing cart id", async () => {
      mockCartService.listCarts.mockResolvedValue([{ id: "cart_existing" }]);

      const result = await getOrCreateTool.invoke({ customer_id: "cus_1" });

      expect(mockCartService.listCarts).toHaveBeenCalledWith(
        { customer_id: "cus_1" },
        expect.objectContaining({ take: 5 }),
      );
      expect(result).toBe("cart_existing");
      expect(mockCartService.createCarts).not.toHaveBeenCalled();
    });

    it("should create new cart if none exists", async () => {
      mockCartService.listCarts.mockResolvedValue([]);
      mockCartService.createCarts.mockResolvedValue({ id: "cart_new" });
      mockCustomerService.retrieveCustomer.mockResolvedValue({
        email: "test@test.com",
      });

      const result = await getOrCreateTool.invoke({ customer_id: "cus_1" });

      expect(mockCartService.createCarts).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: "cus_1",
          region_id: defaultRegion.id,
          currency_code: defaultRegion.currency_code,
          email: "test@test.com",
        }),
      );
      expect(result).toBe("cart_new");
    });

    it("should create new cart with fallback email if customer not found", async () => {
      mockCartService.listCarts.mockResolvedValue([]);
      mockCartService.createCarts.mockResolvedValue({ id: "cart_new" });
      mockCustomerService.retrieveCustomer.mockRejectedValue(
        new Error("Not found"),
      );

      const result = await getOrCreateTool.invoke({ customer_id: "cus_1" });

      expect(mockCartService.createCarts).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: "cus_1",
          region_id: defaultRegion.id,
          currency_code: defaultRegion.currency_code,
          email: "cus_1@example.com",
        }),
      );
      expect(result).toBe("cart_new");
    });

    it("should ignore completed carts and create new one", async () => {
      mockCartService.listCarts.mockResolvedValue([
        { id: "cart_completed", completed_at: new Date() },
      ]);
      mockCartService.createCarts.mockResolvedValue({ id: "cart_new" });
      mockCustomerService.retrieveCustomer.mockResolvedValue({
        email: "test@test.com",
      });

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
    const defaultCart = {
      id: "cart_1",
      region_id: "reg_1",
      currency_code: "usd",
    };
    const defaultVariant = { id: "var_1", title: "Test Variant" };
    const defaultPrice = 1500;

    interface SetupOverrides {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cart?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variant?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pricing?: any;
    }

    const setupContext = (overrides: SetupOverrides = {}) => {
      mockCartService.retrieveCart.mockResolvedValue(
        overrides.cart || defaultCart,
      );
      mockProductService.listAndCountProductVariants.mockResolvedValue([
        [overrides.variant || defaultVariant],
        1,
      ]);
      mockPricingService.calculatePrices.mockResolvedValue(
        overrides.pricing || [{ calculated_amount: defaultPrice }],
      );
      mockCartService.addLineItems.mockResolvedValue({});
    };

    it("should add item successfully", async () => {
      setupContext();

      const result = await addItemTool.invoke({
        cart_id: "cart_1",
        variant_id: "var_1",
        quantity: 2,
      });

      expect(
        mockProductService.listAndCountProductVariants,
      ).toHaveBeenCalledWith({ id: "var_1" }, { take: 1 });

      expect(mockPricingService.calculatePrices).toHaveBeenCalledWith(
        { id: ["var_1"] },
        {
          context: {
            currency_code: "usd",
            region_id: "reg_1",
          },
        },
      );

      expect(mockCartService.addLineItems).toHaveBeenCalledWith("cart_1", [
        {
          variant_id: "var_1",
          quantity: 2,
          title: "Test Variant",
          unit_price: 1500,
        },
      ]);
      expect(result).toContain("Item added");
    });

    it("should handle error if variant not found", async () => {
      mockProductService.listAndCountProductVariants.mockResolvedValue([[], 0]);

      const result = await addItemTool.invoke({
        cart_id: "cart_1",
        variant_id: "var_1",
        quantity: 2,
      });

      expect(result).toContain(
        "Error: Failed to add item. Variant var_1 not found.",
      );
    });

    it("should handle error if price not found", async () => {
      setupContext({ pricing: [] });

      const result = await addItemTool.invoke({
        cart_id: "cart_1",
        variant_id: "var_1",
        quantity: 2,
      });

      expect(result).toContain(
        "Error: Failed to add item. Could not determine price for variant var_1",
      );
    });

    it("should handle errors from cart service", async () => {
      setupContext();
      mockCartService.addLineItems.mockRejectedValue(new Error("Out of stock"));

      const result = await addItemTool.invoke({
        cart_id: "cart_1",
        variant_id: "var_1",
        quantity: 2,
      });

      expect(result).toContain("Error: Failed to add item. Out of stock");
    });
  });
});
