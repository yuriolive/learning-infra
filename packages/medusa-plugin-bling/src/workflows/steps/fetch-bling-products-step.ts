import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { BLING_MODULE } from "../../modules/bling.js";
import BlingModuleService from "../../modules/bling/service.js";
import { BlingProductMapper } from "../../modules/bling/utils/product-mapper.js";

export const fetchBlingProductsStep = createStep(
  "fetch-bling-products",
  async (_, { container }) => {
    const blingService: BlingModuleService = container.resolve(BLING_MODULE);
    const logger = container.resolve("logger");

    const config = await blingService.getBlingConfig();
    const preferences = blingService.mergePreferences(
      {},
      config?.syncPreferences ?? undefined
    );

    if (!preferences.products.enabled) {
      logger.info("Product sync disabled in preferences");
      return new StepResponse([]);
    }

    try {
      // API call to fetch products
      // Note: Pagination should be handled for large catalogs.
      // For MVP/Simplicity we fetch one page or rely on service.
      // Bling V3 uses /produtos with pagination (limite, pagina).
      // Here we assume service handles it or we iterate.
      // Let's implement basic iteration or simple fetch in service.

      const response = await blingService.getProducts({ limit: 100 });
      const rawProducts = Array.isArray(response.data) ? response.data : [];

      // Normalize
      const normalized = rawProducts.map((p: any) =>
        BlingProductMapper.normalizeProductSnapshot(p, preferences)
      );

      return new StepResponse(normalized);
    } catch (error: any) {
      logger.error(`Failed to fetch products from Bling: ${error.message}`);
      throw error;
    }
  }
);
