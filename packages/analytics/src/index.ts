/* eslint-disable no-console */
import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export const initAnalytics = (
  apiKey?: string,
  options?: { host?: string; flushAt?: number; flushInterval?: number },
) => {
  if (client) return client;

  const key = apiKey || process.env.POSTHOG_API_KEY;
  const host =
    options?.host || process.env.POSTHOG_HOST || "https://app.posthog.com";

  if (!key) {
    // Only warn once
    if (process.env.NODE_ENV !== "test") {
      console.warn("Analytics: POSTHOG_API_KEY not found, analytics disabled");
    }
    return null;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: Record<string, any> = {},
) => {
  try {
    if (!client) {
      initAnalytics();
    }
    if (!client) return;

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
    console.error("Failed to capture analytics error", error_);
  }
};

export const shutdown = async () => {
  if (client) {
    await client.shutdown();
  }
};
