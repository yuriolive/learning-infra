import { GoogleAuth } from "google-auth-library";

/**
 * Generates an OIDC ID Token for the specified target URL using the application's default credentials.
 * This checks for GOOGLE_APPLICATION_CREDENTIALS env var.
 */
export async function getTenantAuthToken(targetUrl: string): Promise<string> {
  const auth = new GoogleAuth();
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
