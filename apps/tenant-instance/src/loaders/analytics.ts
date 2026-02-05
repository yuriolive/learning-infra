import type { MedusaContainer } from "@medusajs/medusa";

const analyticsLoader = async (
  container: MedusaContainer,
  _config: Record<string, unknown>,
): Promise<void> => {
  try {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST;

    if (apiKey) {
      const { initAnalytics } = await import("@vendin/analytics");
      initAnalytics(apiKey, host ? { host } : undefined);
    }
  } catch (error) {
    const logger = container.resolve("logger");
    logger.warn(`Failed to init analytics: ${error}`);
  }
};

export default analyticsLoader;
