import { logger } from "@vendin/utils/logger";
import { NextResponse } from "next/server";

import { fetchTenantBySubdomain, fetchTenantById } from "./lib/tenant/client";
import {
  extractSubdomainFromHostname,
  shouldRedirectToMarketing,
  isLocalhost,
} from "./lib/tenant/resolver";

import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - provisioning (status page)
     * - suspended (status page)
     */
    "/((?!_next/static|_next/image|favicon.ico|provisioning|suspended).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // 1. Handle www redirect
  if (hostname.startsWith("www.")) {
    const newHostname = hostname.replace("www.", "");
    return NextResponse.redirect(
      new URL(`${url.protocol}//${newHostname}${url.pathname}${url.search}`),
      301,
    );
  }

  // 2. Extract Subdomain / Tenant ID
  let tenantId: string | null = null;
  let subdomain: string | null = null;
  let tenant = null;

  if (isLocalhost(hostname)) {
    // Check for header override first
    const headerSubdomain = request.headers.get("X-Tenant-Subdomain");
    if (headerSubdomain) {
      subdomain = headerSubdomain;
      tenant = await fetchTenantBySubdomain(subdomain);
    } else {
      // Fallback to env var
      const developmentTenantId = process.env.DEVELOPMENT_TENANT_ID;
      if (developmentTenantId) {
        tenantId = developmentTenantId;
        tenant = await fetchTenantById(tenantId);
      }
    }
  } else {
    // Production / Preview
    if (shouldRedirectToMarketing(hostname)) {
      return NextResponse.next();
    }

    subdomain = extractSubdomainFromHostname(hostname);

    if (subdomain) {
      tenant = await fetchTenantBySubdomain(subdomain);
    } else {
      // Invalid subdomain or custom domain (not supported)
      // Log handled by generic not found below
    }
  }

  // If no tenant resolved
  if (!tenant) {
    logger.warn({
      msg: "Tenant not found for hostname",
      hostname,
    });
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  // 3. Status Handling
  if (tenant.status === "provisioning") {
    return NextResponse.rewrite(new URL("/provisioning", request.url));
  }
  if (tenant.status === "suspended") {
    return NextResponse.rewrite(new URL("/suspended", request.url));
  }
  if (["deleted", "provisioning_failed"].includes(tenant.status)) {
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  // 4. Inject Headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("X-Tenant-Id", tenant.id);
  requestHeaders.set("X-Tenant-Subdomain", tenant.subdomain || "");
  requestHeaders.set("X-Tenant-Name", encodeURIComponent(tenant.name));
  requestHeaders.set("X-Tenant-Status", tenant.status);
  if (tenant.apiUrl) {
    requestHeaders.set("X-Tenant-Api-Url", tenant.apiUrl);
  }

  // Log success (structured)
  logger.info({
    msg: "Tenant resolved",
    tenantId: tenant.id,
    subdomain: tenant.subdomain,
    hostname,
  });

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
