import { MedusaContainer } from "@medusajs/medusa";
import { initAnalytics } from "@vendin/analytics";

export default async (
  container: MedusaContainer,
  config: Record<string, unknown>,
): Promise<void> => {
  try {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST;

    if (apiKey) {
      initAnalytics(apiKey, host ? { host } : undefined);
    }
  } catch (err) {
    console.warn("Failed to init analytics", err);
  }
};
