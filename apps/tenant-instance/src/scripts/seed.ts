import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import type { ExecArgs } from "@medusajs/framework/types";

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  logger.info("Seeding Tenant Instance...");

  const storeModuleService = container.resolve(Modules.STORE);
  const regionModuleService = container.resolve(Modules.REGION);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const apiKeyModuleService = container.resolve(Modules.API_KEY);

  // 1. Create Default Sales Channel
  let defaultSalesChannel;
  // listSalesChannels returns SalesChannelDTO[]
  const salesChannels = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (salesChannels.length > 0) {
    defaultSalesChannel = salesChannels[0];
    logger.info("Default sales channel already exists.");
  } else {
    defaultSalesChannel = await salesChannelModuleService.createSalesChannels({
      name: "Default Sales Channel",
      description: "Created by seed script",
    });
    logger.info("Created default sales channel.");
  }

  // 2. Create Store
  const stores = await storeModuleService.listStores();
  if (stores.length === 0) {
    await storeModuleService.createStores({
      name: "Medusa Store",
      supported_currencies: [{ currency_code: "usd" }],
      default_sales_channel_id: defaultSalesChannel.id,
    });
    logger.info("Created default store.");
  } else {
    logger.info("Store already exists.");
  }

  // 3. Create Region
  const regions = await regionModuleService.listRegions({
    currency_code: "usd",
  });
  if (regions.length === 0) {
    // createRegions supports singular object
    await regionModuleService.createRegions({
      name: "North America",
      currency_code: "usd",
      countries: ["us", "ca"],
      // payment_providers: ["pp_system_default"],
    });
    logger.info("Created North America region.");
  } else {
    logger.info("Region (USD) already exists.");
  }

  // 4. Create Publishable API Key
  const apiKeys = await apiKeyModuleService.listApiKeys({
    title: "Development Key",
  });
  if (apiKeys.length === 0) {
    const apiKey = await apiKeyModuleService.createApiKeys({
      title: "Development Key",
      type: "publishable",
      created_by: "seed-script",
    });

    // Link to sales channel
    await remoteLink.create({
      [Modules.API_KEY]: {
        api_key_id: apiKey.id,
      },
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: defaultSalesChannel.id,
      },
    });

    logger.info(`Created Publishable API Key: ${apiKey.token}`);
  } else {
    logger.info("Development API Key already exists.");
  }

  logger.info("Seeding complete.");
}
