import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.nextUrl.hostname;

  // Handle www redirect
  if (hostname.startsWith("www.")) {
    url.hostname = hostname.replace("www.", "");
    return NextResponse.redirect(url);
  }

  // Root domain handling
  // Memory: "serves the application landing page for the root domain (vendin.store) by allowing the request to proceed"
  if (hostname === "vendin.store" || hostname === "localhost") {
     return NextResponse.next();
  }

  // Prepare headers container
  const requestHeaders = new Headers(request.headers);

  // Determine tenant
  let tenantId: string | null = null;
  let tenantSubdomain: string | null = null;
  let tenantStatus = "active";
  let tenantApiUrl = "";
  let tenantName = "";

  // Helper to set tenant headers
  const setTenantHeaders = () => {
    requestHeaders.set("X-Tenant-Id", tenantId!);
    if (tenantSubdomain) requestHeaders.set("X-Tenant-Subdomain", tenantSubdomain);
    requestHeaders.set("X-Tenant-Name", tenantName);
    requestHeaders.set("X-Tenant-Status", tenantStatus);
    if (tenantApiUrl) requestHeaders.set("X-Tenant-Api-Url", tenantApiUrl);
  };

  if (hostname.includes("localhost") || hostname.endsWith(".local")) {
    // Development handling
    tenantId = process.env.DEVELOPMENT_TENANT_ID || "dev-tenant";
    tenantSubdomain = "dev";
    tenantName = "Development Tenant";
    tenantApiUrl = "http://localhost:3000/api";
  } else {
    // Subdomain resolution
    // Standard subdomain structure: tenant.vendin.store
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      tenantSubdomain = parts[0];

      // TODO: Fetch tenant info from Control Plane
      // This logic is currently mocked. In production, this should fetch from the Control Plane.
      // const res = await fetch(`${process.env.CONTROL_PLANE_URL}/api/tenants/lookup?subdomain=${tenantSubdomain}`);

      // Mock resolution
      tenantId = `tenant-${tenantSubdomain}`;
      tenantName = `${tenantSubdomain} Store`;
    }
  }

  if (!tenantId) {
    // If we can't identify a tenant and it's not root domain
    return new NextResponse("Tenant not found", { status: 404 });
  }

  setTenantHeaders();

  // Status handling rewrites
  if (tenantStatus === "suspended") {
    url.pathname = "/suspended";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  if (tenantStatus === "provisioning") {
    url.pathname = "/provisioning";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  if (tenantStatus === "provisioning_failed") {
    url.pathname = "/provisioning_failed";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // Pass headers to downstream request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

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
