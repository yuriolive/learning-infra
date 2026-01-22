import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BLING_MODULE } from "../../modules/bling/index.js";
import { BlingProductMapper } from "../../modules/bling/utils/product-mapper.js";

import type BlingModuleService from "../../modules/bling/service.js";

export const fetchBlingProductsStep = createStep(
  "fetch-bling-products",
  async (_, { container }) => {
    const blingService: BlingModuleService = container.resolve(BLING_MODULE);
    const logger = container.resolve("logger");

    const config = await blingService.getBlingConfig();
    const preferences = blingService.mergePreferences(
      {},
      config?.syncPreferences ?? undefined,
    );

    if (!preferences.products.enabled) {
      logger.info("Product sync disabled in preferences");
      return new StepResponse([]);
    }

    try {
      // Improved pagination logic for robust fetching
      const allProducts: any[] = [];
      let page = 1;
      const limit = 100; // Configurable limit could be added to preferences
      let hasMore = true;

      while (hasMore) {
        // Pass page and limit to getProducts
        // Assuming getProducts handles pagination params as generic object
        const response = await blingService.getProducts({ limit, page });
        const data = response?.data; // Check API structure. Usually { data: [...] } or just array

        const rawProducts = Array.isArray(data) ? data : [];

        if (rawProducts.length === 0) {
          hasMore = false;
        } else {
          allProducts.push(...rawProducts);
          if (rawProducts.length < limit) {
            hasMore = false;
          } else {
            page++;
          }
        }

        // Safety break to prevent infinite loops in bad API responses
        if (page > 100) {
          logger.warn("Fetch products limit reached (100 pages), stopping.");
          hasMore = false;
        }
      }

      const normalized = allProducts.map((p: any) =>
        BlingProductMapper.normalizeProductSnapshot(p, preferences),
      );

      return new StepResponse(normalized);
    } catch (error: any) {
      logger.error(`Failed to fetch products from Bling: ${error.message}`);
      throw error;
    }
  },
);
