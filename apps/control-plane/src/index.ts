import { createLogger } from "@vendin/utils/logger";
import { serve } from "bun";

import { TenantRepository } from "./domains/tenants/tenant.repository";
import { createTenantRoutes } from "./domains/tenants/tenant.routes";
import { TenantService } from "./domains/tenants/tenant.service";
import { generateOpenAPISpec } from "./openapi/generator";

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
    const origin = `${url.protocol}//${url.host}`;

    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
          endpoints: {
            docs: "/docs",
            health: "/health",
            openapi: "/openapi.json",
            tenants: "/api/tenants",
          },
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

    if (url.pathname === "/openapi.json") {
      const spec = generateOpenAPISpec(origin);
      return new Response(JSON.stringify(spec), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (url.pathname === "/docs") {
      const spec = generateOpenAPISpec(origin);
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vendin Control Plane API - Documentation</title>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.js"></script>
</head>
<body>
  <div id="api-reference"></div>
  <script>
    (function() {
      var configuration = {
        spec: ${JSON.stringify(spec)},
        theme: "purple",
        layout: "modern",
      };

      function initScalar() {
        if (typeof Scalar !== "undefined" && Scalar.createApiReference) {
          Scalar.createApiReference("#api-reference", configuration);
        } else {
          setTimeout(initScalar, 50);
        }
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initScalar);
      } else {
        initScalar();
      }
    })();
  </script>
</body>
</html>`;
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Access-Control-Allow-Origin": "*",
        },
      });
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

    const response = await tenantRoutes.handleRequest(request);
    return response;
  },
  port,
});

logger.info(`Control Plane API listening on http://localhost:${server.port}`);
