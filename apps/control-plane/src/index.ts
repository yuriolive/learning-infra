import { createLogger } from "@vendin/utils/logger";
import { serve } from "bun";

import { TenantRepository } from "./domains/tenants/tenant.repository";
import { createTenantRoutes } from "./domains/tenants/tenant.routes";
import { TenantService } from "./domains/tenants/tenant.service";

const nodeEnvironment = process.env.NODE_ENV ?? "development";
const logger = createLogger({
  logLevel: process.env.LOG_LEVEL,
  nodeEnv: nodeEnvironment,
});

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const tenantRepository = new TenantRepository();
const tenantService = new TenantService(tenantRepository);
const tenantRoutes = createTenantRoutes({ logger, tenantService });

const server = serve({
  error(error: unknown) {
    logger.error({ error }, "Unhandled error in server");
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
        },
      );
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    return tenantRoutes.handleRequest(request);
  },
  port,
});

logger.info(`Control Plane API listening on http://localhost:${server.port}`);
