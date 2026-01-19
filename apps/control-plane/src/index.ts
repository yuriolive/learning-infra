import { serve } from "bun";

import { createTenantRoutes } from "./domains/tenants/tenant.routes";
import { TenantService } from "./domains/tenants/tenant.service";
import { TenantRepository } from "./domains/tenants/tenant.repository";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const tenantRepository = new TenantRepository();
const tenantService = new TenantService(tenantRepository);
const tenantRoutes = createTenantRoutes({ tenantService });

const server = serve({
  error(error: unknown) {
    console.error("Unhandled error:", error);
    return new Response("Internal server error", { status: 500 });
  },
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    return tenantRoutes.handleRequest(request);
  },
  port,
});

console.log(`Control Plane API listening on http://localhost:${server.port}`);
