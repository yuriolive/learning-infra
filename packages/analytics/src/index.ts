import { PostHog } from "posthog-node";

let client: PostHog | null = null;

const getPostHogConfig = (apiKey?: string, options?: { host?: string }) => {
  const key = apiKey || process.env.POSTHOG_API_KEY;
  const host =
    options?.host || process.env.POSTHOG_HOST || "https://app.posthog.com";
  return { key, host };
};

export const initAnalytics = (
  apiKey?: string,
  options?: { host?: string; flushAt?: number; flushInterval?: number },
) => {
  if (client) return client;

  const { key, host } = getPostHogConfig(apiKey, options);

  if (!key) {
    if (process.env.NODE_ENV === "test") return null;
    throw new Error(
      "PostHog API key is not configured. Analytics is disabled.",
    );
  }

  client = new PostHog(key, {
    host,
    flushAt: options?.flushAt ?? 1,
    flushInterval: options?.flushInterval ?? 0,
  });

  return client;
};

export const captureError = (
  error: unknown,
  context: Record<string, unknown> = {},
) => {
  try {
    if (!client) {
      if (process.env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.warn(
          "Analytics client not initialized, skipping error capture.",
        );
      }
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const cause = error instanceof Error ? error.cause : undefined;

    client.capture({
      distinctId: "server",
      event: "server_error",
      properties: {
        message: errorMessage,
        stack,
        cause,
        ...context,
      },
    });
  } catch (error_) {
    // eslint-disable-next-line no-console
    console.error("Failed to capture analytics error", error_);
  }
};

export const shutdown = async () => {
  if (client) {
    await client.shutdown();
  }
};

/** @internal */
export const __resetClient = () => {
  client = null;
};
