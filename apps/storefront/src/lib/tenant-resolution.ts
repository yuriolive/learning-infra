import { Tenant } from "../types/tenant";

const TENANT_CACHE_TTL = 60; // 60 seconds

export async function resolveTenant(hostname: string): Promise<Tenant | null> {
  // Construct a synthetic request for the cache key
  const cacheKey = new Request(`http://tenant-resolution/${hostname}`);

  // Use the standard Cloudflare cache
  // In Edge Runtime, caches.default is often available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = (caches as any).default;

  // 1. Cache Lookup
  if (cache) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const data = await cachedResponse.json();
      return data as Tenant;
    }
  }

  // 2. Source Fetch
  const controlPlaneUrl = process.env.CONTROL_PLANE_API_URL;

  if (!controlPlaneUrl) {
    console.error("CONTROL_PLANE_API_URL not defined");
    return null;
  }

  try {
    const res = await fetch(`${controlPlaneUrl}/api/tenants?subdomain=${encodeURIComponent(hostname)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
        if (res.status === 404) return null;
        console.error(`Failed to fetch tenant: ${res.status} ${res.statusText}`);
        return null;
    }

    const tenants = await res.json();
    // API returns Tenant[]
    const tenantData = Array.isArray(tenants) ? tenants[0] : null;

    if (!tenantData) return null;

    // Map to Storefront Tenant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = tenantData.metadata as any;

    const tenant: Tenant = {
      id: tenantData.id,
      name: tenantData.name,
      subdomain: tenantData.subdomain || hostname,
      backendUrl: tenantData.apiUrl || "",
      theme: metadata?.theme || {
        primaryColor: "#000000",
        fontFamily: "Inter",
        logoUrl: "",
      },
    };

    // 3. Cache Update
    if (cache) {
      const response = new Response(JSON.stringify(tenant), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, s-maxage=${TENANT_CACHE_TTL}`,
        },
      });

      await cache.put(cacheKey, response);
    }

    return tenant;

  } catch (error) {
    console.error("Error resolving tenant:", error);
    return null;
  }
}
