import { timingSafeEqual } from "node:crypto";

import { type Logger } from "@vendin/utils/logger";

/**
 * Compares two strings using constant-time comparison to prevent timing attacks.
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal, false otherwise
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Authenticates a request using a fixed Bearer token.
 * Checks if the Authorization header contains a valid Bearer token matching ADMIN_API_KEY.
 * @param request - The incoming HTTP request
 * @param apiKey - The expected API key from environment
 * @param logger - Logger instance
 * @returns A Response object if authentication fails (401/500), or null if successful.
 */
export function authenticateRequest(
  request: Request,
  apiKey: string | undefined,
  logger: Logger,
): Response | null {
  if (!apiKey) {
    logger.error("ADMIN_API_KEY is not set in environment");
    return new Response(
      JSON.stringify({
        error: "Server configuration error",
        message: "Authentication not configured",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const authorizationHeader = request.headers.get("Authorization");

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Invalid or missing API key",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const token = authorizationHeader.split(" ")[1];

  if (!token || !safeEqual(token, apiKey)) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Invalid or missing API key",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  return null;
}

/**
 * Generates CORS headers based on the environment and request origin.
 * In non-production environments, allows all origins (*).
 * In production, checks against ALLOWED_ORIGINS environment variable.
 * @param request - The incoming HTTP request
 * @param allowedOriginsString - Comma-separated list of allowed origins
 * @param nodeEnv - Current node environment
 * @returns HeadersInit object containing CORS headers
 */
export function getCorsHeaders(
  request: Request,
  allowedOriginsString: string = "",
  nodeEnvironment: string = "development",
): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = allowedOriginsString.split(",").map((s) => s.trim());
  const isProduction = nodeEnvironment === "production";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (!isProduction) {
    headers["Access-Control-Allow-Origin"] = "*";
  } else if (allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}
