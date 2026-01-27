import { createHash, timingSafeEqual } from "node:crypto";

import type { Logger } from "@vendin/utils/logger";

export interface MiddlewareOptions {
  logger: Logger;
  adminApiKey: string | undefined;
  nodeEnv: string;
  allowedOrigins: string[];
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function areEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Creates an authentication middleware to validate the ADMIN_API_KEY.
 * Returns a function that checks for the Authorization: Bearer <token> header.
 */
export function createAuthMiddleware(options: MiddlewareOptions) {
  const { adminApiKey, logger } = options;

  return (request: Request): Response | null => {
    // Skip auth if adminApiKey is not configured (e.g. initial setup or non-prod without key)
    // However, for MVP and requirements, we should probably enforce it if it's there.
    if (!adminApiKey) {
      logger.warn("ADMIN_API_KEY not configured. Skipping authentication.");
      return null;
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.slice(7);
    if (!areEqual(token, adminApiKey)) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return null; // Authentication successful
  };
}

/**
 * Creates a CORS middleware to handle Access-Control headers.
 */
export function createCorsMiddleware(options: MiddlewareOptions) {
  const { nodeEnv, allowedOrigins } = options;

  return (request: Request, response: Response): Response => {
    const origin = request.headers.get("Origin");
    const headers = new Headers(response.headers);

    let allowOrigin: string | null = "*";
    if (nodeEnv === "production") {
      if (allowedOrigins && allowedOrigins.length > 0) {
        // Only set header if origin is explicitly allowed
        allowOrigin = origin && allowedOrigins.includes(origin) ? origin : null;
      } else {
        // No allowed origins configured in production - block all CORS
        allowOrigin = null;
      }
    } else {
      // In development/test, "*" is usually fine unless specified
      allowOrigin = origin || "*";
    }

    // Only set Access-Control-Allow-Origin if we have a valid origin
    if (allowOrigin) {
      headers.set("Access-Control-Allow-Origin", allowOrigin);
    }
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Helper to inject CORS headers into any response.
 */
export function wrapResponse(
  response: Response,
  request: Request,
  options: MiddlewareOptions,
): Response {
  const corsMiddleware = createCorsMiddleware(options);
  return corsMiddleware(request, response);
}
