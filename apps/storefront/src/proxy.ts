import { NextResponse } from "next/server";

import { resolveTenant } from "./lib/tenant-resolution";

import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    // Keep matcher values as literal strings: Next.js statically validates this export
    // and rejects computed values during segment config analysis.
    // Skip Next.js internals and all static files, but process everything else
    // prettier-ignore
    "/((?!_next|favicon.ico|public|.*\\..*).*)",
    // Explicitly ensure our proxy is caught if the above regex is too aggressive
    "/api/medusa/:path*",
  ],
};

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;

  // Security check: Block direct access to /mnt routes
  // These routes should only be accessible via internal rewrites
  if (url.pathname.startsWith("/mnt")) {
    return new NextResponse(null, { status: 404 });
  }

  const hostname = request.headers.get("host");

  if (!hostname) {
    return NextResponse.next();
  }

  // Resolve Tenant
  const tenant = await resolveTenant(hostname);

  if (!tenant) {
    // If tenant not found, redirect to Marketing App
    const marketingUrl =
      process.env.MARKETING_APP_URL || "https://vendin.store";
    return NextResponse.redirect(marketingUrl);
  }

  // Target: /mnt/:tenantId/:path
  url.pathname = `/mnt/${tenant.id}${url.pathname}`;

  // Prepare headers for downstream
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-url", tenant.backendUrl);

  // Create response with rewrite and modified request headers
  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  });
}
