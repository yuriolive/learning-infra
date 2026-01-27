import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
  ],
};

interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  status: string;
  apiUrl: string;
}

export default async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const rootDomain = "vendin.store";

  // 1. Handle localhost
  if (hostname.includes("localhost")) {
    const devTenantId = process.env.DEVELOPMENT_TENANT_ID;
    if (devTenantId) {
  const rootDomain = process.env.ROOT_DOMAIN || "vendin.store";
    }
    return NextResponse.next();
  }

  // 2. Handle Root Domain and www
  if (hostname === `www.${rootDomain}`) {
    return NextResponse.redirect(new URL(`https://${rootDomain}${url.pathname}${url.search}`));
  }

  if (hostname === rootDomain) {
    return NextResponse.next();
  }

  // 3. Extract Subdomain
  let subdomain = hostname.split(".")[0];
  if (hostname.endsWith(`.${rootDomain}`)) {
    subdomain = hostname.replace(`.${rootDomain}`, "");
  }

  // 4. Lookup Tenant
  return handleTenantBySubdomain(request, subdomain);
}

async function handleTenantBySubdomain(request: NextRequest, subdomain: string) {
  const controlPlaneUrl = process.env.CONTROL_PLANE_API_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${controlPlaneUrl}/api/tenants/lookup?subdomain=${subdomain}`, {
      next: { revalidate: 300 },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
       if (res.status === 404) {
           return NextResponse.rewrite(new URL("/404", request.url));
       }
       return NextResponse.next();
    }

    const tenant: Tenant = await res.json();
    return processTenant(request, tenant);

  } catch (error) {
    console.error("Tenant lookup failed", error);
    return NextResponse.rewrite(new URL("/error", request.url));
  }
}

async function handleTenantById(request: NextRequest, tenantId: string) {
   const controlPlaneUrl = process.env.CONTROL_PLANE_API_URL || "http://localhost:3000";
   try {
     const res = await fetch(`${controlPlaneUrl}/api/tenants/${tenantId}`, {
         next: { revalidate: 300 }
     });

     if (!res.ok) return NextResponse.next();

     const tenant: Tenant = await res.json();
     return processTenant(request, tenant);
   } catch (error) {
       console.error(error);
       return NextResponse.next();
   }
}

function processTenant(request: NextRequest, tenant: Tenant) {
    if (tenant.status === "suspended") {
        return NextResponse.rewrite(new URL("/suspended", request.url));
    }
    if (tenant.status === "provisioning" || tenant.status === "provisioning_failed") {
        return NextResponse.rewrite(new URL("/provisioning", request.url));
    }

    if (!tenant.apiUrl) {
        return NextResponse.rewrite(new URL("/error", request.url));
    }

    const targetUrl = new URL(tenant.apiUrl);
    targetUrl.pathname = request.nextUrl.pathname;
    targetUrl.search = request.nextUrl.search;

    const response = NextResponse.rewrite(targetUrl);

    response.headers.set("X-Tenant-Id", tenant.id);
    response.headers.set("X-Tenant-Subdomain", tenant.subdomain);
    response.headers.set("X-Tenant-Name", tenant.name);
    response.headers.set("X-Tenant-Status", tenant.status);
    if (tenant.apiUrl) {
      response.headers.set("X-Tenant-Api-Url", tenant.apiUrl);
    }

    return response;
}
