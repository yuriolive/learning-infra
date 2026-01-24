import { createLogger } from "@vendin/utils/logger";

const logger = createLogger({ nodeEnv: process.env.NODE_ENV });

/**
 * Authenticates a request using a fixed Bearer token.
 * Checks if the Authorization header contains a valid Bearer token matching ADMIN_API_KEY.
 * @param request - The incoming HTTP request
 * @returns A Response object if authentication fails (401/500), or null if successful.
 */
export function authenticateRequest(request: Request): Response | null {
  const apiKey = process.env.ADMIN_API_KEY;

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
  if (token !== apiKey) {
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
 * @returns HeadersInit object containing CORS headers
 */
export function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowedOriginsString = process.env.ALLOWED_ORIGINS ?? "";
  const allowedOrigins = allowedOriginsString.split(",").map((s) => s.trim());
  const isProduction = process.env.NODE_ENV === "production";

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
