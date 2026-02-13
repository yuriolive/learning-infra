import { describe, it, expect } from "vitest";
import { BlingProductMapper } from "../product-mapper.js";

// Mock preferences inline since we can't easily import types if they depend on relative paths that might be tricky
// But we can import if path is correct.
// path: ../../../models/bling-config
// from: src/modules/bling/utils/__tests../product-mapper.js.spec.ts
// up 1: utils
// up 2: bling
// up 3: modules
// up 4: src
// models is in src/models
// So ../../../models/bling-config is correct.

import type { BlingSyncPreferences } from "../../../models/bling-config.js";

describe("BlingProductMapper", () => {
  const preferences: BlingSyncPreferences = {
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
      default_status: "Atendido",
      default_state_registration: "ISENTO",
    },
  };

  it("should normalize a simple product", () => {
    const raw = {
      id: "123",
      nome: "Test Product",
      preco: 100,
    };

    const result = BlingProductMapper.normalizeProductSnapshot(
      raw,
      preferences,
    );

    expect(result.external_id).toBe("123");
    expect(result.name).toBe("Test Product");
    expect(result.price).toBe(100);
  });

  it("should handle variants", () => {
    const raw = {
      id: "123",
      nome: "T-Shirt",
      variacoes: [
        {
          variacao: {
            id: "v1",
            nome: "T-Shirt Red",
            preco: 100,
            sku: "TSHIRT-RED",
          }
        },
        {
          variacao: {
            id: "v2",
            nome: "T-Shirt Blue",
            preco: 100,
            sku: "TSHIRT-BLUE",
          }
        }
      ]
    };

    const result = BlingProductMapper.normalizeProductSnapshot(raw, preferences);

    expect(result.variants).toHaveLength(2);
    expect(result.variants[0].external_id).toBe("v1");
    expect(result.variants[0].sku).toBe("TSHIRT-RED");
  });

  it("should extract images", () => {
    const raw = {
      id: "123",
      nome: "Product",
      imagem: [
        { link: "http://image.com/1.jpg" },
        { url: "http://image.com/2.jpg" }
      ]
    };

    const result = BlingProductMapper.normalizeProductSnapshot(raw, preferences);

    expect(result.images).toEqual(["http://image.com/1.jpg", "http://image.com/2.jpg"]);
  });

  it("should extract stock from flat structure", () => {
    const raw = {
      id: "123",
      nome: "P",
      saldo: 10
    };
    const result = BlingProductMapper.normalizeProductSnapshot(raw, preferences);
    expect(result.stock).toEqual([{ quantity: 10, warehouse_id: null }]);
  });

  it("should parse number correctly from string", () => {
    const raw = {
      id: "123",
      nome: "P",
      preco: "1.050,50"
    };

    const result = BlingProductMapper.normalizeProductSnapshot(raw, preferences);
    expect(result.price).toBe(1050.5);
  });
});
