import { createCloudflareLogger } from "@vendin/logger";
import { NextResponse } from "next/server";

import { getTenantAuthToken } from "@/lib/auth";

import type { NextRequest } from "next/server";

const logger = createCloudflareLogger({ nodeEnv: process.env.NODE_ENV });

export const dynamic = "force-dynamic";

/**
 * Resolves the Tenant Backend URL.
 * In a real implementation, this would look up the tenant based on the hostname or a header.
 * For MVP/single-tenant, we can fallback to env var or a hardcoded value.
 */
function resolveBackendUrl(request: NextRequest): string | null {
  // 1. Try to get explicit backend URL from header (set by Middleware)
  const headerUrl = request.headers.get("x-medusa-backend-url");
  if (headerUrl) return headerUrl;

  // 2. Fallback: Check env var (useful for local dev or single tenant)
  if (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
  }

  return null;
}

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const pathString = path.join("/");

  const backendUrl = resolveBackendUrl(request);
  if (!backendUrl) {
    return NextResponse.json(
      { message: "Backend URL not found for this tenant." },
      { status: 500 },
    );
  }

  // Construct target URL
  const searchParameters = request.nextUrl.searchParams.toString();
  const targetUrl = `${backendUrl}/${pathString}${searchParameters ? `?${searchParameters}` : ""}`;

  try {
    // 1. Get OIDC Token (Security: Only Storefront can generate this)
    const authHeader = await getTenantAuthToken(backendUrl);

    // 2. Forward Request
    const headers = new Headers(request.headers);
    headers.set("Authorization", authHeader);
    headers.set("Host", new URL(backendUrl).host); // Important for Cloud Run

    // Remove headers that might confuse the backend or are hop-by-hop
    headers.delete("connection");
    headers.delete("content-length"); // Let fetch recalculate
    headers.delete("x-medusa-backend-url");

    const body =
      request.method !== "GET" && request.method !== "HEAD"
        ? await request.blob()
        : undefined;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    // 3. Return Response
    const responseHeaders = new Headers(response.headers);
    // Clean up CORS or Transfer-Encoding headers if needed,
    // but usually passing through is fine for simple proxy.

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    logger.error({ error, targetUrl, method: request.method }, "Proxy Error");
    return NextResponse.json(
      { message: "Internal Server Error during proxying" },
      { status: 500 },
    );
  }
}

export function GET(
  request: NextRequest,
  properties: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, properties);
}

export function POST(
  request: NextRequest,
  properties: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, properties);
}

export function PUT(
  request: NextRequest,
  properties: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, properties);
}

export function DELETE(
  request: NextRequest,
  properties: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, properties);
}
