import { createLogger } from "@vendin/utils/logger";
import { LRUCache } from "lru-cache";

import { createDatabase } from "./database/database";
import { TenantRepository } from "./domains/tenants/tenant.repository";
import { createTenantRoutes } from "./domains/tenants/tenant.routes";
import { TenantService } from "./domains/tenants/tenant.service";
import { generateOpenAPISpec } from "./openapi/generator";

interface Environment {
  DATABASE_URL: string;
  LOG_LEVEL?: string;
  NODE_ENV?: string;
}

const openApiSpecs = new LRUCache<
  string,
  ReturnType<typeof generateOpenAPISpec>
>({
  max: 100,
  ttl: 1000 * 60 * 60,
});

function getOpenAPISpec(origin: string) {
  let spec = openApiSpecs.get(origin);
  if (!spec) {
    spec = generateOpenAPISpec(origin);
    openApiSpecs.set(origin, spec);
  }
  return spec;
}

function getDocumentationHtml(spec: unknown) {
  return `<!DOCTYPE html>
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
}

function handleApiRequest(
  request: Request,
  url: URL,
  origin: string,
  tenantRoutes: ReturnType<typeof createTenantRoutes>,
): Response | Promise<Response> {
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
    const spec = getOpenAPISpec(origin);
    return new Response(JSON.stringify(spec), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (url.pathname === "/docs") {
    const spec = getOpenAPISpec(origin);
    return new Response(getDocumentationHtml(spec), {
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

  return tenantRoutes.handleRequest(request);
}

export default {
  async fetch(
    request: Request,
    environment: Environment,
    _context: unknown,
  ): Promise<Response> {
    const nodeEnvironment = environment.NODE_ENV ?? "development";
    const logger = createLogger({
      logLevel: environment.LOG_LEVEL,
      nodeEnv: nodeEnvironment,
    });

    const database = createDatabase(environment.DATABASE_URL, nodeEnvironment);
    const tenantRepository = new TenantRepository(database);
    const tenantService = new TenantService(tenantRepository);
    const tenantRoutes = createTenantRoutes({ logger, tenantService });

    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;

    try {
      return await handleApiRequest(request, url, origin, tenantRoutes);
    } catch (error: unknown) {
      logger.error({ error }, "Unhandled error in server");
      return new Response("Internal server error", { status: 500 });
    }
  },
};
