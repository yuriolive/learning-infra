import { describe, it, expect } from "vitest";

import { BlingOrderMapper } from "../order-mapper.js";

import type { BlingSyncPreferences } from "../../../../models/bling-config";
import type { OrderDTO } from "@medusajs/types";

// Mock OrderDTO for testing
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends object | undefined
      ? DeepPartial<T[P]>
      : T[P];
};

type MockOrder = DeepPartial<OrderDTO> & Record<string, unknown>;

/**
 * Helper to cast partial objects to full DTOs for testing
 */
function mock<T>(p: DeepPartial<T>): T {
  return p as unknown as T;
}

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
      } as unknown as MockOrder["shipping_address"],
      billing_address: {
        first_name: "John",
        last_name: "Doe",
      } as unknown as MockOrder["billing_address"],
      items: [
        {
          id: "item_1",
          title: "Product 1",
          quantity: 2,
          subtotal: 2000, // 20.00 total -> 10.00 unit
          discount_total: 0,
          metadata: { external_id: "ext_1" },
        } as unknown as NonNullable<MockOrder["items"]>[number],
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
      shipping_address: mock<OrderDTO["shipping_address"]>({
        address_1: "Main St",
        metadata: {},
      }),
      items: [] as unknown as MockOrder["items"],
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
      shipping_address: mock<OrderDTO["shipping_address"]>({
        address_1: "Main St",
        metadata: { cpf: "11111111111" },
      }),
      items: [] as unknown as MockOrder["items"],
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
        } as unknown as NonNullable<MockOrder["items"]>[number],
      ] as unknown as MockOrder["items"],
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
        } as unknown as NonNullable<MockOrder["items"]>[number],
      ] as unknown as MockOrder["items"],
      total: 1000,
    };

    const result = BlingOrderMapper.mapToBlingPayload(
      order as OrderDTO,
      preferences,
      options,
      [],
    );

    // 1000 / 3 = 333.333 -> /100 = 3.33333... -> toFixed(4) = 3.3333
    expect(result.itens[0]!.valor).toBe(3.3333);
  });

  // Mock a Medusa order for house number tests
  const mockMedusaOrder: MockOrder = {
    id: "ord_house_number",
    created_at: new Date(),
    shipping_address: {
      first_name: "John",
      last_name: "Doe",
      address_1: "Rua Teste",
      postal_code: "12345-678",
      city: "City",
      province: "SP",
      metadata: { cpf: "12345678909" },
    },
    items: [
      {
        id: "item_1",
        title: "Product 1",
        quantity: 1,
        subtotal: 10_000,
        metadata: { external_id: "ext_1" },
      } as unknown as NonNullable<MockOrder["items"]>[number],
    ],
    total: 10_000,
  };

  it("should extract house number from address_1 using regex", () => {
    const result = BlingOrderMapper.mapToBlingPayload(
      {
        ...mockMedusaOrder,
        shipping_address: {
          ...(mockMedusaOrder.shipping_address as unknown as Record<
            string,
            unknown
          >),
          address_1: "Rua Teste 123",
          address_2: "",
        } as unknown as MockOrder["shipping_address"],
      } as unknown as OrderDTO,
      preferences,
      options,
      [],
    );

    expect(result.cliente.numero).toBe("123");
  });

  it("should fallback to address_2 for house number", () => {
    const result = BlingOrderMapper.mapToBlingPayload(
      {
        ...mockMedusaOrder,
        shipping_address: {
          ...(mockMedusaOrder.shipping_address as unknown as Record<
            string,
            unknown
          >),
          address_1: "Rua Teste",
          address_2: "456",
        } as unknown as MockOrder["shipping_address"],
      } as unknown as OrderDTO,
      preferences,
      options,
      [],
    );

    expect(result.cliente.numero).toBe("456");
  });

  it("should use 'S/N' when no house number is found", () => {
    const result = BlingOrderMapper.mapToBlingPayload(
      {
        ...mockMedusaOrder,
        shipping_address: {
          ...(mockMedusaOrder.shipping_address as unknown as Record<
            string,
            unknown
          >),
          address_1: "Rua Teste",
          address_2: "",
        } as unknown as MockOrder["shipping_address"],
      } as unknown as OrderDTO,
      preferences,
      options,
      [],
    );

    expect(result.cliente.numero).toBe("S/N");
  });

  it("should handle fractional cents with 4-decimal precision for unit price", () => {
    const result = BlingOrderMapper.mapToBlingPayload(
      {
        ...mockMedusaOrder,
        items: [
          {
            ...(mockMedusaOrder.items![0] as unknown as Record<
              string,
              unknown
            >),
            quantity: 3,
            subtotal: 1000, // 10.00 / 3 = 3.3333...
          } as unknown as NonNullable<MockOrder["items"]>[number],
        ],
      } as unknown as OrderDTO,
      preferences,
      options,
      [],
    );

    expect(result.itens![0]!.valor).toBe(3.3333);
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
        address_2: "",
        city: "São Paulo",
        province: "SP",
        postal_code: "01234-567",
        country_code: "br",
        phone: "11987654321",
        metadata: {
          cpf: "123.456.789-09",
        },
      } as unknown as MockOrder["shipping_address"],
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
        } as unknown as NonNullable<MockOrder["items"]>[number],
      ],
      shipping_methods: [
        {
          name: "Standard Shipping",
          amount: 1500,
          metadata: {
            service_code: "12345",
            shipping_type: "SEDEX",
          },
        } as unknown as NonNullable<MockOrder["shipping_methods"]>[number],
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
    expect(result.cliente.numero).toBe("100");
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
        } as unknown as NonNullable<MockOrder["items"]>[number],
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
