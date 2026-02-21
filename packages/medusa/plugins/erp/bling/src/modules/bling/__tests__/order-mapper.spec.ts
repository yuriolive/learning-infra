import { describe, it, expect } from "vitest";

import { BlingOrderMapper } from "../utils/order-mapper.js";

import type { BlingSyncPreferences } from "../../../models/bling-config.js";
import type { OrderDTO } from "@medusajs/types";

describe("BlingOrderMapper", () => {
  const mockPreferences: BlingSyncPreferences = {
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
    },
  };

  const mockOptions = {
    generateNfe: false,
    generateShippingLabel: false,
  };

  it("should correctly convert Medusa cents to Bling floats", () => {
    const mockOrder = {
      id: "order_123",
      display_id: 123,
      created_at: new Date().toISOString(),
      email: "test@example.com",
      currency_code: "brl",
      total: 15_050, // 150.50
      discount_total: 1000, // 10.00
      shipping_total: 1500, // 15.00
      shipping_address: {
        first_name: "John",
        last_name: "Doe",
        address_1: "Rua Teste",
        address_2: "123",
        city: "São Paulo",
        province: "SP",
        postal_code: "01234-567",
        country_code: "br",
        phone: "11987654321",
        metadata: {
          cpf: "529.982.247-25",
        },
      },
      items: [
        {
          id: "item_1",
          title: "Product 1",
          variant_sku: "SKU001",
          quantity: 2,
          subtotal: 10_000, // 100.00 total for 2 items => 50.00 each
          discount_total: 500, // 5.00
          metadata: {
            bling_external_id: "BLING_001",
          },
        },
      ],
      shipping_methods: [
        {
          name: "Standard Shipping",
          amount: 1500,
        },
      ],
      metadata: {},
    } as unknown as OrderDTO;

    const warnings: string[] = [];
    const result = BlingOrderMapper.mapToBlingPayload(
      mockOrder,
      mockPreferences,
      mockOptions,
      warnings,
    );

    // Currently, these are expected to FAIL if my analysis is correct (except items)
    // because they are not yet divided by 100 in the code.
    expect(result.total).toBe(150.5);
    expect(result.vlr_desconto).toBe(10);
    expect(result.vlr_frete).toBe(15);

    // Items ARE already divided by 100 in the current code (as verified by the TODO)
    expect(result.itens[0]!.valor).toBe(50); // (10000 / 2) / 100
    expect(result.itens[0]!.desconto).toBe(5); // 500 / 100
  });
});
