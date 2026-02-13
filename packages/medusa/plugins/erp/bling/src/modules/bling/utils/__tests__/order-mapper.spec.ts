import { describe, it, expect } from "vitest";
import { BlingOrderMapper } from "../order-mapper.js";
import type { BlingSyncPreferences } from "../../../models/bling-config.js";

// Mock OrderDTO roughly
type MockOrder = any;

describe("BlingOrderMapper", () => {
  const preferences: BlingSyncPreferences = {
    products: { enabled: true, import_images: true, import_descriptions: true, import_prices: true },
    inventory: { enabled: true, bidirectional: false, locations: [] },
    orders: {
      enabled: true,
      send_to_bling: true,
      receive_from_bling: true,
      generate_nfe: false,
      default_status: "Atendido",
      default_state_registration: "ISENTO",
    },
  };

  const options = {
    generateNfe: false,
    generateShippingLabel: false,
  };

  it("should map order correctly", () => {
    const order: MockOrder = {
      id: "ord_123",
      display_id: 1001,
      created_at: new Date("2023-01-01T10:00:00Z"),
      email: "test@example.com",
      shipping_address: {
        first_name: "John",
        last_name: "Doe",
        address_1: "Main St 123",
        postal_code: "12345-678",
        city: "City",
        province: "SP",
        metadata: { cpf: "12345678909" },
      },
      billing_address: {
        first_name: "John",
        last_name: "Doe",
      },
      items: [
        {
          id: "item_1",
          title: "Product 1",
          quantity: 2,
          subtotal: 2000, // 20.00 total -> 10.00 unit
          discount_total: 0,
          metadata: { external_id: "ext_1" },
        }
      ],
      total: 2000,
      shipping_total: 0,
      discount_total: 0,
      metadata: {},
    };

    const result = BlingOrderMapper.mapToBlingPayload(order, preferences, options, []);

    expect(result.numeroPedidoLoja).toBe("ord_123");
    expect(result.numero).toBe(1001);
    expect(result.data).toBe("2023-01-01");
    expect(result.cliente.nome).toBe("John Doe");
    expect(result.cliente.cpf_cnpj).toBe("12345678909");
    expect(result.cliente.endereco).toBe("Main St 123");
    expect(result.cliente.cep).toBe("12345678");

    expect(result.itens).toHaveLength(1);
    expect(result.itens[0].codigo).toBe("ext_1");
    expect(result.itens[0].descricao).toBe("Product 1");
    expect(result.itens[0].quantidade).toBe(2);
    expect(result.itens[0].valor).toBe(10); // 2000 / 2 = 1000 -> /100 = 10
  });

  it("should throw if address is missing", () => {
    const order: MockOrder = {
      id: "ord_123",
      items: [],
    };
    expect(() => BlingOrderMapper.mapToBlingPayload(order, preferences, options, [])).toThrow("Pedido sem endereço");
  });

  it("should throw if document is missing", () => {
    const order: MockOrder = {
      id: "ord_123",
      shipping_address: { address_1: "Main St", metadata: {} },
      items: [],
    };
    expect(() => BlingOrderMapper.mapToBlingPayload(order, preferences, options, [])).toThrow("CPF ou CNPJ obrigatório");
  });

  it("should throw if document is invalid", () => {
    const order: MockOrder = {
      id: "ord_123",
      shipping_address: { address_1: "Main St", metadata: { cpf: "11111111111" } },
      items: [],
    };
    expect(() => BlingOrderMapper.mapToBlingPayload(order, preferences, options, [])).toThrow("CPF informado é inválido");
  });

  it("should handle discount", () => {
    const order: MockOrder = {
      id: "ord_123",
      created_at: new Date(),
      shipping_address: { address_1: "Main St", metadata: { cpf: "12345678909" } },
      items: [
        {
          id: "item_1",
          quantity: 1,
          subtotal: 1000,
          discount_total: 100, // 1.00 discount
          metadata: { external_id: "ext_1" },
        }
      ],
      total: 900,
      discount_total: 100,
    };

    const result = BlingOrderMapper.mapToBlingPayload(order, preferences, options, []);

    expect(result.vlr_desconto).toBe(100);
  });

  it("should extract house number from regex", () => {
    const order: MockOrder = {
      id: "ord_123",
      created_at: new Date(),
      shipping_address: { address_1: "Main Street 456 Apt 2", metadata: { cpf: "12345678909" } },
      items: [{ id: "i1", quantity: 1, subtotal: 100, metadata: { external_id: "e1" } }],
      total: 100,
    };
    const result = BlingOrderMapper.mapToBlingPayload(order, preferences, options, []);
    expect(result.cliente.numero).toBe("456");
  });

  it("should extract house number from address_2", () => {
    const order: MockOrder = {
      id: "ord_123",
      created_at: new Date(),
      shipping_address: { address_1: "Main Street", address_2: "789", metadata: { cpf: "12345678909" } },
      items: [{ id: "i1", quantity: 1, subtotal: 100, metadata: { external_id: "e1" } }],
      total: 100,
    };
    const result = BlingOrderMapper.mapToBlingPayload(order, preferences, options, []);
    expect(result.cliente.numero).toBe("789");
  });

  it("should use default house number S/N if extraction fails", () => {
    const order: MockOrder = {
      id: "ord_123",
      created_at: new Date(),
      shipping_address: { address_1: "Main Street No Number", metadata: { cpf: "12345678909" } },
      items: [{ id: "i1", quantity: 1, subtotal: 100, metadata: { external_id: "e1" } }],
      total: 100,
    };
    const result = BlingOrderMapper.mapToBlingPayload(order, preferences, options, []);
    expect(result.cliente.numero).toBe("S/N");
  });
});
