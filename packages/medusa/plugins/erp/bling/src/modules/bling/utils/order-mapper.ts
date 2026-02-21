import {
  isValidCNPJ,
  isValidCPF,
  sanitizeDocument,
} from "./document-validation.js";

import type { BlingSyncPreferences } from "../../../models/bling-config.js";
import type { OrderSyncOptions } from "../types/index.js";
import type { OrderDTO } from "@medusajs/types";

export interface BlingOrderPayload {
  numeroPedidoLoja: string;
  data: string;
  situacao: string;
  cliente: {
    nome: string;
    tipoPessoa: "F" | "J";
    cpf_cnpj: string;
    endereco: string;
    numero: string;
    bairro: string;
    complemento?: string;
    email?: string;
    fone?: string;
    cep?: string;
    cidade?: string;
    uf?: string;
    ie_rg?: string;
  };
  itens: Array<{
    codigo: string;
    descricao: string;
    quantidade: number;
    valor: number;
    desconto?: number;
  }>;
  transporte?: {
    transportadora?: string;
    tipo_frete?: string;
    servico_correios?: string;
    dados_etiqueta?: {
      nome: string;
      endereco: string;
      numero: string;
      complemento?: string;
      municipio?: string;
      uf?: string;
      cep?: string;
      bairro?: string;
    };
  };
  total?: number;
  vlr_frete?: number;
  vlr_desconto?: number;
  observacoes?: string;
  observacoesInternas?: string;
  natureza_operacao?: string;
  gerar_nfe?: "S";
  gerar_etiqueta?: "S";
  parcelas?: Array<{
    data: string;
    vlr: number;
    obs?: string;
  }>;
  numero?: number;
}

export class BlingOrderMapper {
  static mapToBlingPayload(
    order: OrderDTO,
    preferences: BlingSyncPreferences,
    options: OrderSyncOptions,
    warnings: string[],
  ): BlingOrderPayload {
    const shippingAddress = order.shipping_address ?? order.billing_address;
    if (!shippingAddress) {
      throw new Error(
        "Pedido sem endereço. Endereço de entrega ou faturamento é obrigatório.",
      );
    }

    const document = this.extractDocument(order, shippingAddress);
    if (!document) {
      throw new Error(
        "CPF ou CNPJ obrigatório para sincronizar o pedido com o Bling.",
      );
    }

    const documentDigits = sanitizeDocument(document);
    const isCpf = documentDigits.length === 11;
    if (isCpf && !isValidCPF(documentDigits)) {
      throw new Error("CPF informado é inválido.");
    }
    if (!isCpf && !isValidCNPJ(documentDigits)) {
      throw new Error("CNPJ informado é inválido.");
    }

    if (!shippingAddress.address_1) {
      throw new Error(
        "Endereço (logradouro) é obrigatório para sincronizar o pedido.",
      );
    }

    const itemsPayload = this.buildItemsPayload(order.items ?? [], warnings);
    if (itemsPayload.length === 0) {
      throw new Error(
        "Nenhum item do pedido possui SKU ou ID associado no Bling.",
      );
    }

    const addressMetadata =
      (shippingAddress.metadata as Record<string, unknown> | null) || {};
    const orderMetadata =
      (order.metadata as Record<string, unknown> | null) || {};

    const nomeCliente = this.composeCustomerName(order);
    const telefone = this.pickString(
      shippingAddress.phone,
      order.billing_address?.phone,
      orderMetadata?.telefone,
      orderMetadata?.phone,
    );
    const bairro =
      this.pickString(
        addressMetadata?.bairro,
        addressMetadata?.district,
        shippingAddress.province,
      ) ?? "Centro";
    const numero = this.extractHouseNumber(shippingAddress) ?? "S/N";
    const uf =
      this.pickString(
        addressMetadata?.uf,
        shippingAddress.province,
        shippingAddress.country_code,
      ) ?? "SP";
    const cep = shippingAddress.postal_code
      ? sanitizeDocument(shippingAddress.postal_code)
      : undefined;

    // Medusa amounts are integers (cents), Bling expects floats
    const totalAmount = Math.round(this.safeNumber(order.total)) / 100;
    const discountTotal =
      Math.round(this.safeNumber(order.discount_total)) / 100;

    const cliente: BlingOrderPayload["cliente"] = {
      nome: nomeCliente,
      tipoPessoa: isCpf ? "F" : "J",
      cpf_cnpj: documentDigits,
      endereco: shippingAddress.address_1,
      numero,
      bairro,
    };

    const complemento = this.pickString(
      addressMetadata?.complemento,
      shippingAddress.address_2,
    );
    if (complemento) {
      cliente.complemento = complemento;
    }

    const email = order.email ?? this.pickString(orderMetadata?.email);
    if (email) {
      cliente.email = email;
    }

    const telefoneNormalizado = telefone
      ? sanitizeDocument(telefone)
      : undefined;
    if (telefoneNormalizado) {
      cliente.fone = telefoneNormalizado;
    }

    if (cep) {
      cliente.cep = cep;
    }

    if (shippingAddress.city) {
      cliente.cidade = shippingAddress.city;
    }

    if (uf) {
      cliente.uf = uf;
    }

    const inscricaoEstadual = this.pickString(
      addressMetadata?.state_registration,
      preferences.orders.default_state_registration || "ISENTO",
    );
    if (inscricaoEstadual) {
      cliente.ie_rg = inscricaoEstadual;
    }

    const shippingMethod = (order.shipping_methods ?? [])[0];
    // Medusa amounts are integers (cents), Bling expects floats
    const freightValue =
      Math.round(
        this.safeNumber(order.shipping_total ?? shippingMethod?.amount),
      ) / 100;
    const shippingMetadata =
      (shippingMethod?.metadata as Record<string, unknown> | null) || {};

    const payload: BlingOrderPayload = {
      numeroPedidoLoja: order.id,
      situacao: preferences.orders.default_status || "Atendido",
      data: new Date(order.created_at).toISOString().slice(0, 10),
      cliente,
      itens: itemsPayload,
      total: totalAmount,
    };

    if (order.display_id) {
      payload.numero = order.display_id;
    }

    if (freightValue > 0) {
      payload.vlr_frete = freightValue;
    }

    if (discountTotal > 0) {
      payload.vlr_desconto = discountTotal;
    }

    const observacoes = this.pickString(orderMetadata?.["observacoes"]);
    if (observacoes) {
      payload.observacoes = observacoes;
    }

    const observacoesInternas = this.pickString(
      orderMetadata?.["observacoes_internas"],
    );
    if (observacoesInternas) {
      payload.observacoesInternas = observacoesInternas;
    }

    const naturezaOperacao = this.pickString(
      orderMetadata?.["natureza_operacao"],
    );
    if (naturezaOperacao) {
      payload.natureza_operacao = naturezaOperacao;
    }

    if (preferences.orders.generate_nfe || options.generateNfe) {
      payload.gerar_nfe = "S";
    }

    if (options.generateShippingLabel) {
      payload.gerar_etiqueta = "S";
    }

    // Installments logic if needed, skipping for MVP/Simplicity unless transactions are available in OrderDTO robustly
    // The previous implementation used order.transactions, checking if it exists
    // We'll skip complex installment logic for now or implement basic if needed.

    // Transport/Shipping Label Data
    const enderecoEntrega: Record<string, unknown> = {
      nome: cliente.nome,
      endereco: cliente.endereco,
      numero: cliente.numero,
      bairro: cliente.bairro,
    };

    if (cliente.complemento) enderecoEntrega.complemento = cliente.complemento;
    if (cliente.cidade) enderecoEntrega.municipio = cliente.cidade;
    if (cliente.uf) enderecoEntrega.uf = cliente.uf;
    if (cliente.cep) enderecoEntrega.cep = cliente.cep;

    const transporte: Record<string, unknown> = {
      dados_etiqueta: enderecoEntrega,
    };

    if (shippingMethod?.name) {
      transporte.transportadora = shippingMethod.name;
    }

    const serviceCode = this.pickString(shippingMetadata?.service_code);
    if (serviceCode) {
      transporte.servico_correios = serviceCode;
    }

    const shippingType = this.pickString(shippingMetadata?.shipping_type);
    if (shippingType) {
      transporte.tipo_frete = shippingType;
    }

    payload.transporte = transporte;

    return payload;
  }

  private static extractDocument(
    order: OrderDTO,
    address: { metadata?: unknown },
  ): string | null {
    const addressMetadata =
      (address.metadata as Record<string, unknown> | null) || {};
    const billingMetadata =
      (order.billing_address?.metadata as Record<string, unknown> | null) || {};
    const orderMetadata =
      (order.metadata as Record<string, unknown> | null) || {};

    const candidates = [
      addressMetadata.document,
      addressMetadata.cpf,
      addressMetadata.cnpj,
      billingMetadata.document,
      billingMetadata.cpf,
      billingMetadata.cnpj,
      orderMetadata.document,
      orderMetadata.cpf,
      orderMetadata.cnpj,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return null;
  }

  private static buildItemsPayload(
    items: Array<{
      metadata?: unknown;
      title?: string;
      id?: string;
      quantity?: number;
      subtotal?: unknown;
      discount_total?: unknown;
      variant_sku?: string | null;
    }>,
    warnings: string[],
  ): BlingOrderPayload["itens"] {
    return items
      .map((item) => this.mapItemToBlingPayload(item, warnings))
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  private static mapItemToBlingPayload(
    item: {
      metadata?: unknown;
      title?: string;
      id?: string;
      quantity?: number;
      subtotal?: unknown;
      discount_total?: unknown;
      variant_sku?: string | null;
    },
    warnings: string[],
  ): BlingOrderPayload["itens"][0] | null {
    const metadata = (item.metadata as Record<string, unknown> | null) || {};
    const externalId = this.pickString(
      metadata.bling_external_id,
      metadata.external_id,
      metadata.codigo,
      metadata.sku,
      item.variant_sku,
    );

    if (!externalId) {
      warnings.push(
        `Item ${item.title} (ID ${item.id}) ignorado: nenhuma referência de SKU/ID do Bling encontrada.`,
      );
      return null;
    }

    const quantity = item.quantity ?? 0;
    const subtotalValue = this.safeNumber(item.subtotal);

    // Medusa 2.0 amounts are integers (cents), Bling V3 expects floats.
    const unitPrice = quantity > 0 ? Math.round(subtotalValue / quantity) : 0;

    // Medusa stores amounts in the smallest currency unit (cents for BRL).
    // Bling V3 API expects float values (e.g., 10.50).
    const finalUnitPrice = unitPrice / 100;

    const discount = Math.round(this.safeNumber(item.discount_total)) / 100;

    const payload: BlingOrderPayload["itens"][0] = {
      codigo: externalId,
      descricao: item.title ?? "Item sem título",
      quantidade: quantity,
      valor: finalUnitPrice,
    };

    if (discount > 0) {
      payload.desconto = discount;
    }

    return payload;
  }

  private static composeCustomerName(order: OrderDTO): string {
    const shipping = order.shipping_address;
    if (shipping?.first_name) {
      return `${shipping.first_name} ${shipping.last_name ?? ""}`.trim();
    }
    const billing = order.billing_address;
    if (billing?.first_name) {
      return `${billing.first_name} ${billing.last_name ?? ""}`.trim();
    }
    return order.email ?? "Cliente";
  }

  private static extractHouseNumber(address: {
    metadata?: unknown;
    address_1?: string;
    address_2?: string;
  }): string | undefined {
    const metadata = (address.metadata as Record<string, unknown> | null) || {};
    const candidates = [metadata.number, metadata.numero, address.address_2];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }

    const numericMatch = address.address_1?.match(/(\d+)/);
    if (numericMatch && numericMatch[0]) {
      return numericMatch[0];
    }
    return undefined;
  }

  private static safeNumber(value: unknown): number {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.replaceAll(",", "."));
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === "object") {
      const v = value as { toNumber?: () => number; value?: unknown };
      if (typeof v.toNumber === "function") return v.toNumber();
      if ("value" in v) return this.safeNumber(v.value);
    }
    return 0;
  }

  private static pickString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
    return undefined;
  }
}
