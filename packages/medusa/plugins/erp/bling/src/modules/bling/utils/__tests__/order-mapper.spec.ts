import { describe, it, expect } from "vitest";

import { BlingOrderMapper } from "../order-mapper.js";

import type { BlingSyncPreferences } from "../../../../models/bling-config";
import type { OrderDTO } from "@medusajs/types";

// Mock OrderDTO roughly
type MockOrder = {
  [K in keyof OrderDTO]?: unknown;
};

describe("BlingOrderMapper", () => {
  const preferences: BlingSyncPreferences = {
    products: {
      enabled: true,
      import_images: true,
      import_descriptions: true,
      import_prices: true,
    },
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
        },
      ],
      total: 2000,
      shipping_total: 0,
      discount_total: 0,
      metadata: {},
    };

    const result = BlingOrderMapper.mapToBlingPayload(
      order as OrderDTO,
      preferences,
      options,
      [],
    );

    expect(result.numeroPedidoLoja).toBe("ord_123");
    expect(result.numero).toBe(1001);
    expect(result.data).toBe("2023-01-01");
    expect(result.cliente.nome).toBe("John Doe");
    expect(result.cliente.cpf_cnpj).toBe("12345678909");
    expect(result.cliente.endereco).toBe("Main St 123");
    expect(result.cliente.cep).toBe("12345678");

    expect(result.itens).toHaveLength(1);
    expect(result.itens![0]!.codigo).toBe("ext_1");
    expect(result.itens![0]!.descricao).toBe("Product 1");
    expect(result.itens![0]!.quantidade).toBe(2);
    expect(result.itens![0]!.valor).toBe(10); // 2000 / 2 = 1000 -> /100 = 10
  });

  it("should throw if address is missing", () => {
    const order: MockOrder = {
      id: "ord_123",
      items: [],
    };
    expect(() =>
      BlingOrderMapper.mapToBlingPayload(
        order as OrderDTO,
        preferences,
        options,
        [],
      ),
    ).toThrow("Pedido sem endereço");
  });

  it("should throw if document is missing", () => {
    const order: MockOrder = {
      id: "ord_123",
      shipping_address: { address_1: "Main St", metadata: {} },
      items: [],
    };
    expect(() =>
      BlingOrderMapper.mapToBlingPayload(
        order as OrderDTO,
        preferences,
        options,
        [],
      ),
    ).toThrow("CPF ou CNPJ obrigatório");
  });

  it("should throw if document is invalid", () => {
    const order: MockOrder = {
      id: "ord_123",
      shipping_address: {
        address_1: "Main St",
        metadata: { cpf: "11111111111" },
      },
      items: [],
    };
    expect(() =>
      BlingOrderMapper.mapToBlingPayload(
        order as OrderDTO,
        preferences,
        options,
        [],
      ),
    ).toThrow("CPF informado é inválido");
  });

  it("should handle discount", () => {
    const order: MockOrder = {
      id: "ord_123",
      created_at: new Date(),
      shipping_address: {
        address_1: "Main St",
        metadata: { cpf: "12345678909" },
      },
      items: [
        {
          id: "item_1",
          quantity: 1,
          subtotal: 1000,
          discount_total: 100, // 1.00 discount
          metadata: { external_id: "ext_1" },
        },
      ],
      total: 900,
      discount_total: 100,
    };

    const result = BlingOrderMapper.mapToBlingPayload(
      order as OrderDTO,
      preferences,
      options,
      [],
    );

    expect(result.vlr_desconto).toBe(1);
  });

  it("should handle rounding for unit prices with recurring decimals", () => {
    const order: MockOrder = {
      id: "ord_rounding",
      created_at: new Date(),
      shipping_address: {
        address_1: "Main St",
        metadata: { cpf: "12345678909" },
      },
      items: [
        {
          id: "item_1",
          quantity: 3,
          subtotal: 1000, // 10.00 total for 3 items => 3.3333... unit
          metadata: { external_id: "ext_1" },
        },
      ],
      total: 1000,
    };

    const result = BlingOrderMapper.mapToBlingPayload(
      order as OrderDTO,
      preferences,
      options,
      [],
    );

    // 1000 / 3 = 333.333 -> round(333.333) = 333 -> /100 = 3.33
    expect(result.itens[0]!.valor).toBe(3.33);
  });

  it("should handle full order details and currency conversion", () => {
    const order: MockOrder = {
      id: "order_full",
      display_id: 123,
      created_at: new Date("2024-02-21T10:00:00Z"),
      email: "test@example.com",
      currency_code: "brl",
      total: 15_050, // 150.50
      discount_total: 1000, // 10.00
      shipping_total: 1500, // 15.00
      shipping_address: {
        first_name: "John",
        last_name: "Doe",
        address_1: "Rua Teste, 100",
        address_2: "Apt 2",
        city: "São Paulo",
        province: "SP",
        postal_code: "01234-567",
        country_code: "br",
        phone: "11987654321",
        metadata: {
          cpf: "123.456.789-09",
        },
      },
      items: [
        {
          id: "item_1",
          title: "Product 1",
          variant_sku: "SKU001",
          quantity: 2,
          subtotal: 10_000, // 100.00 total => 50.00 unit
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
          metadata: {
            service_code: "12345",
            shipping_type: "SEDEX",
          },
        },
      ],
      metadata: {
        observacoes: "Test note",
        observacoes_internas: "Internal note",
        natureza_operacao: "Venda",
      },
    };

    const warnings: string[] = [];
    const result = BlingOrderMapper.mapToBlingPayload(
      order as OrderDTO,
      preferences,
      options,
      warnings,
    );

    expect(result.total).toBe(150.5);
    expect(result.vlr_desconto).toBe(10);
    expect(result.vlr_frete).toBe(15);
    expect(result.itens[0]!.valor).toBe(50);
    expect(result.itens[0]!.desconto).toBe(5);
    expect(result.cliente.fone).toBe("11987654321");
    expect(result.cliente.cep).toBe("01234567");
    expect(result.observacoes).toBe("Test note");
    expect(result.observacoesInternas).toBe("Internal note");
    expect(result.natureza_operacao).toBe("Venda");
    expect(result.transporte?.transportadora).toBe("Standard Shipping");
    expect(result.transporte?.servico_correios).toBe("12345");
    expect(result.transporte?.tipo_frete).toBe("SEDEX");
  });

  it("should generate NFe and Labels when requested", () => {
    const order: MockOrder = {
      id: "ord_nfe",
      created_at: new Date(),
      shipping_address: {
        address_1: "Main St",
        metadata: { cpf: "12345678909" },
      },
      items: [
        {
          id: "i1",
          quantity: 1,
          subtotal: 100,
          metadata: { external_id: "e1" },
        },
      ],
      total: 100,
    };

    const nfeOptions = {
      generateNfe: true,
      generateShippingLabel: true,
    };

    const result = BlingOrderMapper.mapToBlingPayload(
      order as OrderDTO,
      preferences,
      nfeOptions,
      [],
    );

    expect(result.gerar_nfe).toBe("S");
    expect(result.gerar_etiqueta).toBe("S");
  });
});
