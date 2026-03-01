import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import type { ExecArgs } from "@medusajs/framework/types";

export default async function seedDemoProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  logger.info("Seeding Demo Products...");

  const productModuleService = container.resolve(Modules.PRODUCT);

  // Create categories
  const categories = await productModuleService.createProductCategories([
    { name: "Electronics", is_active: true },
    { name: "Clothing", is_active: true },
    { name: "Home & Garden", is_active: true },
  ]);

  logger.info(`Created ${categories.length} categories.`);

  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const channels = await salesChannelModuleService.listSalesChannels({});
  const channelId = channels[0]?.id;

  // Create products
  const products = Array.from({ length: 10 }, (_, index_) => {
    const index = index_ + 1;
    return {
      title: `Demo Product ${index}`,
      description: `This is a demo product ${index} for testing.`,
      status: "published" as const,
      options: [{ title: "Size", values: ["Small", "Medium", "Large"] }],
      variants: [
        {
          title: "Small Variant",
          options: { Size: "Small" },
          prices: [{ amount: 1000 + index * 100, currency_code: "usd" }],
        },
        {
          title: "Medium Variant",
          options: { Size: "Medium" },
          prices: [{ amount: 1500 + index * 100, currency_code: "usd" }],
        },
      ],
    };
  });

  const createdProducts = await productModuleService.createProducts(products);
  logger.info(`Created ${createdProducts.length} demo products.`);

  if (channelId) {
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
    await Promise.all(
      createdProducts.map((product) =>
        remoteLink.create({
          [Modules.PRODUCT]: {
            product_id: product.id,
          },
          [Modules.SALES_CHANNEL]: {
            sales_channel_id: channelId,
          },
        }),
      ),
    );
    logger.info(`Linked products to sales channel: ${channelId}`);
  }
}
