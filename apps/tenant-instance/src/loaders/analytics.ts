import { initAnalytics } from "@vendin/analytics";

import type { MedusaContainer } from "@medusajs/medusa";

const analyticsLoader = (
  container: MedusaContainer,
  _config: Record<string, unknown>,
): void => {
  try {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST;

    if (apiKey) {
      initAnalytics(apiKey, host ? { host } : undefined);
    }
  } catch (error) {
    const logger = container.resolve("logger");
    logger.warn(`Failed to init analytics: ${error}`);
  }
};

export default analyticsLoader;
