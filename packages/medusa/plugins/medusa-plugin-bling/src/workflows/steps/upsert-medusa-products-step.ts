import { Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import type { ProductSnapshot } from "../../modules/bling/utils/product-mapper.js";

interface UpsertProductsStepInput {
  products: ProductSnapshot[];
}

export const upsertMedusaProductsStep = createStep(
  "upsert-medusa-products",
  async (input: UpsertProductsStepInput, { container }) => {
    const productModule = container.resolve(Modules.PRODUCT);
    const { products } = input;

    if (products.length === 0) {
      return new StepResponse({ created: 0, updated: 0 });
    }

    const externalIds = products.map((p) => p.external_id).filter(Boolean);
    const existingProducts = await productModule.listProducts(
      { external_id: externalIds },
      { relations: ["variants"] },
    );

    const existingMap = new Map(
      existingProducts.map((p) => [p.external_id, p]),
    );
    const upsertData: any[] = [];
    let created = 0;
    let updated = 0;

    for (const snapshot of products) {
      const existing = existingMap.get(snapshot.external_id);

      const variantsData = snapshot.variants.map((v) => ({
        title: v.sku || "Default Variant",
        sku: v.sku,
        barcode: v.barcode,
        metadata: {
          bling_external_id: v.external_id,
        },
      }));

      const productInput: any = {
        title: snapshot.name,
        description: snapshot.description,
        external_id: snapshot.external_id,
        handle: snapshot.external_id,
        status: existing ? existing.status : "draft",
        metadata: {
          bling_source: "bling",
          bling_external_id: snapshot.external_id,
        },
        variants: variantsData,
      };

      if (existing) {
        productInput.id = existing.id;
        updated++;
      } else {
        created++;
      }

      upsertData.push(productInput);
    }

    if (upsertData.length > 0) {
      await productModule.upsertProducts(upsertData);
    }

    return new StepResponse({ created, updated });
  },
);
