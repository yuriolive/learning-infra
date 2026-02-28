import { createCloudflareLogger } from "@vendin/logger";
import { resolveGoogleCredentials } from "@vendin/utils";
import { GoogleAuth } from "google-auth-library";

import type { IdTokenClient } from "google-auth-library";

const logger = createCloudflareLogger({ nodeEnv: process.env.NODE_ENV });

// Cache for IdTokenClient instances to avoid repeated credential parsing and initialization.
// Key: targetUrl, Value: Promise resolving to the auth client.
// Bounded to prevent unbounded memory growth when many unique URLs are encountered.
const MAX_CLIENT_CACHE_SIZE = 50;
const clientCache = new Map<string, Promise<IdTokenClient>>();

/**
 * Generates an OIDC ID Token for the specified target URL using the application's default credentials.
 * This checks for GOOGLE_APPLICATION_CREDENTIALS env var.
 */
export async function getTenantAuthToken(targetUrl: string): Promise<string> {
  // Retrieve or create the cached client promise for this targetUrl.
  // Storing the promise immediately (before any async work) provides thundering herd protection:
  // concurrent requests for the same URL will await the same initialization promise.
  let clientPromise = clientCache.get(targetUrl);

  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        // Support for environment variable containing the service account JSON key.
        // This is required for environments like Cloudflare Workers or Edge where file system access is restricted.
        const serviceAccountJson = await resolveGoogleCredentials();

        let credentials;
        try {
          credentials = serviceAccountJson
            ? JSON.parse(serviceAccountJson)
            : undefined;
        } catch (error) {
          logger.error(
            { error, serviceAccountJsonLength: serviceAccountJson?.length },
            "Failed to parse Google service account credentials",
          );
          throw new Error("Invalid Google credentials configuration");
        }

        const auth = new GoogleAuth({ credentials });

        // idTokenClient requires the target audience (URL) to sign the token for.
        return await auth.getIdTokenClient(targetUrl);
      } catch (error) {
        // If client creation fails, remove the promise from the cache so future attempts can retry.
        clientCache.delete(targetUrl);
        throw error;
      }
    })();

    // Evict the oldest entry if the cache is at capacity (FIFO).
    if (clientCache.size >= MAX_CLIENT_CACHE_SIZE) {
      const oldestKey = clientCache.keys().next().value;
      if (oldestKey !== undefined) {
        clientCache.delete(oldestKey);
      }
    }
    clientCache.set(targetUrl, clientPromise);
  }

  const client = await clientPromise;
  const headers = await client.getRequestHeaders();

  // getRequestHeaders() returns a Web API Headers object in google-auth-library v10+.
  const authHeader = headers.get("Authorization");

  if (!authHeader) {
    throw new Error(
      "Failed to generate Authorization header from Google credentials",
    );
  }

  return authHeader;
}
