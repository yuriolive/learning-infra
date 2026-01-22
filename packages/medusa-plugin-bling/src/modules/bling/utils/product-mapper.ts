import { BlingSyncPreferences } from "../../../models/bling-config.js";

export type ProductSnapshot = {
  external_id: string;
  name: string;
  sku?: string;
  description?: string;
  price?: number | null;
  currency?: string;
  images: string[];
  stock: Array<{ warehouse_id: string | null; quantity: number }>;
  variants: VariantSnapshot[];
  raw: any;
};

export type VariantSnapshot = {
  external_id: string | null;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  currency: string | null;
  weight_kg: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  width_cm: number | null;
  stock: Array<{ warehouse_id: string | null; quantity: number }>;
};

export class BlingProductMapper {
  static normalizeProductSnapshot(
    source: any,
    preferences: BlingSyncPreferences
  ): ProductSnapshot {
    const productWrapper = this.toJsonObject(source);
    const productData = this.toJsonObject(
      this.isJsonObject(productWrapper.produto) ? productWrapper.produto : productWrapper
    );

    const externalId =
      this.toOptionalString(productData.id) ??
      this.toOptionalString(productData.codigo) ??
      this.toOptionalString(productData.sku) ??
      this.toOptionalString(productData.idProduto) ??
      "";

    const includeDescription = preferences.products.import_descriptions;
    const includePrice = preferences.products.import_prices;
    const includeImages = preferences.products.import_images;
    const includeInventory = preferences.inventory.enabled;

    const images = includeImages ? this.extractImageUrls(productData) : [];
    const stockSnapshots = includeInventory
      ? this.extractStockSnapshots(productData)
      : [];
    const variantsSnapshots = this.extractVariantSnapshots(
      productData,
      preferences,
      includeInventory
    );

    const snapshot: ProductSnapshot = {
      external_id: externalId,
      name:
        this.toOptionalString(productData.nome) ??
        this.toOptionalString(productData.descricao) ??
        "Produto sem nome",
      images,
      stock: stockSnapshots,
      variants: variantsSnapshots,
      raw: productData,
    };

    if (includeDescription) {
      const description = this.toOptionalString(productData.descricao);
      if (description) {
        snapshot.description = description;
      }
    }

    if (includePrice) {
      snapshot.price = this.parseNumber(productData.preco);
      snapshot.currency = this.toOptionalString(productData.moeda) ?? "BRL";
    }

    const sku =
      this.toOptionalString(productData.codigo) ??
      this.toOptionalString(productData.sku) ??
      this.toOptionalString(productData.referencia);
    if (sku) {
      snapshot.sku = sku;
    }

    return snapshot;
  }

  private static extractVariantSnapshots(
    productData: any,
    preferences: BlingSyncPreferences,
    includeInventory: boolean
  ): VariantSnapshot[] {
    const rawVariants = this.toJsonArray(productData.variacoes ?? productData.variantes);

    if (rawVariants.length === 0) {
      return [];
    }

    return rawVariants.map((variant) => {
      const variantRoot = this.toJsonObject(variant);
      const variantData = this.toJsonObject(
        this.isJsonObject(variantRoot.variacao) ? variantRoot.variacao : variantRoot
      );
      const variantStock = includeInventory
        ? this.extractStockSnapshots(variantData)
        : [];

      return {
        external_id: this.toOptionalString(variantData.id),
        sku:
          this.toOptionalString(variantData.sku) ??
          this.toOptionalString(variantData.codigo),
        barcode:
          this.toOptionalString(variantData.gtin) ??
          this.toOptionalString(variantData.ean),
        price: preferences.products.import_prices
          ? this.parseNumber(variantData.preco ?? variantData.precoVenda)
          : null,
        currency: preferences.products.import_prices
          ? (this.toOptionalString(variantData.moeda) ?? "BRL")
          : null,
        weight_kg: this.parseNumber(
          variantData.pesoLiquido ?? variantData.pesoBruto
        ),
        depth_cm: this.parseNumber(variantData.comprimento),
        height_cm: this.parseNumber(variantData.altura),
        width_cm: this.parseNumber(variantData.largura),
        stock: variantStock,
      };
    });
  }

  private static extractImageUrls(productData: any): string[] {
    const imagesRaw = productData.imagens ?? productData.imagem;

    if (Array.isArray(imagesRaw)) {
      return imagesRaw
        .map((image) => {
          if (typeof image === "string") {
            return image;
          }
          const imageObject = this.toJsonObject(image);
          const url =
            this.toOptionalString(imageObject.link) ??
            this.toOptionalString(imageObject.url) ??
            this.toOptionalString(imageObject.path);
          return url;
        })
        .filter((url): url is string => Boolean(url));
    }

    if (typeof imagesRaw === "string") {
      return [imagesRaw];
    }

    if (this.isJsonObject(imagesRaw)) {
      const single =
        this.toOptionalString(imagesRaw.link) ?? this.toOptionalString(imagesRaw.url);
      return single ? [single] : [];
    }

    return [];
  }

  private static extractStockSnapshots(data: any): Array<{ warehouse_id: string | null; quantity: number }> {
    const rawEntries = data.estoques ?? data.depositos ?? data.saldo ?? null;

    if (!Array.isArray(rawEntries)) {
      const single = this.normalizeStockEntry(rawEntries);
      return single ? [single] : [];
    }

    return rawEntries
      .map((entry) => this.normalizeStockEntry(entry))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }

  private static normalizeStockEntry(value: any): { warehouse_id: string | null; quantity: number } | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number" || typeof value === "string") {
      return {
        warehouse_id: null,
        quantity: this.parseNumber(value) ?? 0,
      };
    }

    if (Array.isArray(value)) {
      return null;
    }

    const entry = this.toJsonObject(value);
    const warehouseId =
      this.toOptionalString(entry.idDeposito) ??
      this.toOptionalString(entry.id_deposito) ??
      this.toOptionalString(entry.deposito_id) ??
      this.toOptionalString(this.toJsonObject(entry.deposito).id) ??
      null;

    const quantity =
      this.parseNumber(entry.saldo) ??
      this.parseNumber(entry.quantidade) ??
      this.parseNumber(entry.estoque) ??
      this.parseNumber(entry.disponivel) ??
      this.parseNumber(entry.saldoAtual) ??
      this.parseNumber(entry.saldoVirtual) ??
      null;

    if (warehouseId === null && quantity === null) {
      return null;
    }

    return {
      warehouse_id: warehouseId,
      quantity: quantity ?? 0,
    };
  }

  private static parseNumber(value: any): number | null {
    if (typeof value === "number") {
      return Number.isNaN(value) ? null : value;
    }
    if (typeof value === "string") {
      const normalized = value.replace(/\./g, "").replace(",", ".");
      const parsed = Number.parseFloat(normalized);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private static toJsonObject(value: any): any {
    if (this.isJsonObject(value)) {
      return value;
    }
    return {};
  }

  private static toJsonArray(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (value === undefined || value === null) {
      return [];
    }
    return [value];
  }

  private static isJsonObject(value: any): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private static toOptionalString(value: any): string | null {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number") {
      return value.toString();
    }
    return null;
  }
}
