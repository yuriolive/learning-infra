import { createCloudflareLogger } from "@vendin/logger";
import { resolveGoogleCredentials } from "@vendin/utils";
import { GoogleAuth, IdTokenClient } from "google-auth-library";

const logger = createCloudflareLogger({ nodeEnv: process.env.NODE_ENV });

// Cache for IdTokenClient instances to avoid repeated credential parsing and initialization
// Key: targetUrl, Value: Promise resolving to the auth client
const clientCache = new Map<string, Promise<IdTokenClient>>();

/**
 * Generates an OIDC ID Token for the specified target URL using the application's default credentials.
 * This checks for GOOGLE_APPLICATION_CREDENTIALS env var.
 */
export async function getTenantAuthToken(targetUrl: string): Promise<string> {
  // Check if we have a pending or resolved client for this targetUrl
  if (!clientCache.has(targetUrl)) {
    // Create a promise that resolves the client and store it in the cache
    // This ensures that concurrent requests for the same URL share the same initialization logic (thundering herd protection)
    const clientPromise = (async () => {
      try {
        // Support for environment variable containing the service account JSON key
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

        const auth = new GoogleAuth({
          credentials,
        });

        // idTokenClient requires the target audience (URL) to sign the token for.
        return await auth.getIdTokenClient(targetUrl);
      } catch (error) {
        // If client creation fails, remove the promise from the cache so future attempts can retry
        clientCache.delete(targetUrl);
        throw error;
      }
    })();

    clientCache.set(targetUrl, clientPromise);
  }

  try {
    const client = await clientCache.get(targetUrl)!;
    const headers = await client.getRequestHeaders();

    // Format: "Bearer <token>"
    const authHeader = headers.get("Authorization");

    if (!authHeader) {
      throw new Error(
        "Failed to generate Authorization header from Google credentials",
      );
    }

    // Return just the token part if needed, or keeping full header is fine depending on usage.
    // Using full header is safer for immediate forwarding.
    return authHeader;
  } catch (error) {
    // If fetching headers fails (e.g. token refresh error), we allow the error to propagate.
    // The client instance is kept in cache as it might be a transient network issue.
    // If it's a permanent auth error, the process/container might need restart or we could implement smarter invalidation.
    throw error;
  }
}
