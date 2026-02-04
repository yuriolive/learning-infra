import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveTenant } from "./lib/tenant-resolution";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  const hostname = request.headers.get("host");

  if (!hostname) {
     // Should technically not happen in HTTP, but fallthrough
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

  // Create response with rewrite
  const response = NextResponse.rewrite(rewriteUrl);

  // Set headers for downstream components to know the tenant context
  response.headers.set("x-tenant-id", tenant.id);
  response.headers.set("x-tenant-url", tenant.backendUrl);

  return response;
}
