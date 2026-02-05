import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveTenant } from "./lib/tenant-resolution";

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, but process everything else
    "/((?!_next|favicon.ico|public|.*\\..*).*)",
    // Explicitly ensure our proxy is caught if the above regex is too aggressive
    "/api/medusa/:path*",
  ],
};

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host");

  if (!hostname) {
     return NextResponse.next();
  }

  // Resolve Tenant
  const tenant = await resolveTenant(hostname);

  if (!tenant) {
    // If tenant not found, redirect to Marketing App
    const marketingUrl = process.env.MARKETING_APP_URL || "https://vendin.store";
    return NextResponse.redirect(marketingUrl);
  }

  // Rewrite to tenant-specific path
  // Target: /_mnt/:tenantId/:path
  const newPath = `/_mnt/${tenant.id}${url.pathname}`;

  // Construct the rewrite URL
  const rewriteUrl = new URL(newPath, request.url);
  rewriteUrl.search = url.search;

  // Prepare headers for downstream
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-url", tenant.backendUrl);

  // Create response with rewrite and modified request headers
  return NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: requestHeaders,
    },
  });
}
