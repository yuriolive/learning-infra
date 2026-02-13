import { createCloudflareLogger } from "@vendin/logger";
import { resolveGoogleCredentials } from "@vendin/utils";
import { GoogleAuth } from "google-auth-library";

const logger = createCloudflareLogger({ nodeEnv: process.env.NODE_ENV });

/**
 * Generates an OIDC ID Token for the specified target URL using the application's default credentials.
 * This checks for GOOGLE_APPLICATION_CREDENTIALS env var.
 */
export async function getTenantAuthToken(targetUrl: string): Promise<string> {
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
  const client = await auth.getIdTokenClient(targetUrl);
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
}
