import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = url.hostname;

  // 1. Handle www redirect
  if (hostname.startsWith("www.")) {
    const newHostname = hostname.replace("www.", "");
    const newUrl = new URL(url.toString());
    newUrl.hostname = newHostname;
    return NextResponse.redirect(newUrl);
  }

  // 2. Resolve Subdomain
  let subdomain: string | null = null;
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "vendin.store"; // Fallback

  // Handle localhost
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
     // In development, map localhost to a specific tenant if configured,
     // otherwise treat as root/no-subdomain.
     if (process.env.DEVELOPMENT_TENANT_ID) {
         // Could assume a default subdomain for dev
     }
  }

  // Extract subdomain logic
  if (hostname === rootDomain) {
      subdomain = null;
  } else if (hostname.endsWith(`.${rootDomain}`)) {
      subdomain = hostname.replace(`.${rootDomain}`, "");
  } else {
      // Custom domain or localhost
      if (hostname === "localhost") subdomain = null;
      else subdomain = hostname;
  }

  // 3. Root Domain Handling
  if (!subdomain) {
      // Allow request to proceed (Landing Page)
      return NextResponse.next();
  }

  // 4. Resolve Tenant
  try {
      const controlPlaneUrl = process.env.CONTROL_PLANE_API_URL || "http://localhost:8787";
      const lookupUrl = `${controlPlaneUrl}/api/tenants/lookup?subdomain=${subdomain}`;

      const response = await fetch(lookupUrl, {
          next: { revalidate: 60 } // Cache for 60s
      });

      if (!response.ok) {
          if (response.status === 404) {
             return NextResponse.rewrite(new URL("/_not-found", request.url));
          }
          return NextResponse.next();
      }

      const tenant = await response.json();

      // 5. Handle Status
      if (tenant.status === "suspended") {
          return NextResponse.rewrite(new URL("/suspended", request.url));
      }
      if (tenant.status === "provisioning") {
          return NextResponse.rewrite(new URL("/provisioning", request.url));
      }
      if (tenant.status === "provisioning_failed") {
          return NextResponse.rewrite(new URL("/provisioning_failed", request.url));
      }

      // 6. Inject Headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("X-Tenant-Id", tenant.id);
      requestHeaders.set("X-Tenant-Subdomain", tenant.subdomain);

      return NextResponse.next({
          request: {
              headers: requestHeaders,
          },
      });

  } catch (error) {
      console.error("Failed to resolve tenant:", error);
      return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
