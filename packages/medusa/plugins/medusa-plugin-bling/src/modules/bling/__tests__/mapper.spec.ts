import { describe, it, expect } from "vitest";

import { BlingProductMapper } from "../utils/product-mapper.js";

describe("BlingProductMapper", () => {
  it("should normalize a simple product", () => {
    const raw = {
      id: "123",
      nome: "Test Product",
      preco: 100,
    };

    const preferences = {
      products: {
        enabled: true,
        import_images: true,
        import_descriptions: true,
        import_prices: true,
      },
      inventory: {
        enabled: true,
        bidirectional: false,
        locations: [],
      },
      orders: {
        enabled: true,
        send_to_bling: true,
        receive_from_bling: true,
        generate_nfe: false,
      },
    };

    const result = BlingProductMapper.normalizeProductSnapshot(
      raw,
      preferences,
    );

    expect(result.external_id).toBe("123");
    expect(result.name).toBe("Test Product");
    expect(result.price).toBe(100);
  });
});
