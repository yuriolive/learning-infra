import { createLogger } from "@vendin/utils/logger";
import { LRUCache } from "lru-cache";

import { createDatabase } from "./database/database";
import { TenantRepository } from "./domains/tenants/tenant.repository";
import { createTenantRoutes } from "./domains/tenants/tenant.routes";
import { TenantService } from "./domains/tenants/tenant.service";
import { authenticateRequest, getCorsHeaders } from "./middleware";
import { generateOpenAPISpec } from "./openapi/generator";

interface SecretBinding {
  get(): Promise<string>;
}

type BoundSecret = string | SecretBinding;

interface Environment {
  DATABASE_URL: BoundSecret;
  LOG_LEVEL?: string;
  NODE_ENV?: string;
  NEON_API_KEY?: BoundSecret;
  NEON_PROJECT_ID?: BoundSecret;
  ADMIN_API_KEY?: BoundSecret;
  ALLOWED_ORIGINS?: string;
  CLOUDFLARE_API_TOKEN?: BoundSecret;
  CLOUDFLARE_ZONE_ID?: BoundSecret;
}

const openApiSpecs = new LRUCache<
  string,
  ReturnType<typeof generateOpenAPISpec>
>({
  max: 100,
  ttl: 1000 * 60 * 60,
});

function resolveSecret(
  secret: BoundSecret | undefined,
): Promise<string | undefined> {
  if (typeof secret === "object" && secret !== null && "get" in secret) {
    return secret.get();
  }
  return Promise.resolve(secret as string | undefined);
}

function getOpenAPISpec(origin: string) {
  let spec = openApiSpecs.get(origin);
  if (!spec) {
    spec = generateOpenAPISpec(origin);
    openApiSpecs.set(origin, spec);
  }
  return spec;
}

function getDocumentationHtml(_spec: unknown) {
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
        spec: {
          url: "/openapi.json",
        },
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

interface ResolvedEnvironment {
  DATABASE_URL: string;
  LOG_LEVEL?: string;
  NODE_ENV?: string;
  NEON_API_KEY?: string | undefined;
  NEON_PROJECT_ID?: string | undefined;
  ADMIN_API_KEY?: string | undefined;
  ALLOWED_ORIGINS?: string;
  CLOUDFLARE_API_TOKEN?: string | undefined;
  CLOUDFLARE_ZONE_ID?: string | undefined;
}

// Export for integration testing
export const handleRequest = async (
  request: Request,
  tenantRoutes: ReturnType<typeof createTenantRoutes>,
  environment: ResolvedEnvironment,
  logger: ReturnType<typeof createLogger>,
): Promise<Response> => {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const corsHeaders = getCorsHeaders(
    request,
    environment.ALLOWED_ORIGINS,
    environment.NODE_ENV,
  );

  // Helper to attach CORS to response
  const withCors = (response_: Response) => {
    const headers = corsHeaders as Record<string, string>;
    for (const [k, v] of Object.entries(headers)) {
      response_.headers.set(k, v);
    }
    return response_;
  };

  // Handle Preflight
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }));
  }

  if (url.pathname === "/health" || url.pathname === "/") {
    return withCors(
      new Response(
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
          },
        },
      ),
    );
  }

  if (url.pathname === "/openapi.json") {
    const spec = getOpenAPISpec(origin);
    return withCors(
      new Response(JSON.stringify(spec), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  }

  if (url.pathname === "/docs") {
    const spec = getOpenAPISpec(origin);
    return withCors(
      new Response(getDocumentationHtml(spec), {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }),
    );
  }

  // Authenticate /api/tenants/* routes
  if (url.pathname.startsWith("/api/tenants")) {
    const authError = authenticateRequest(
      request,
      environment.ADMIN_API_KEY,
      logger,
    );
    if (authError) {
      return withCors(authError);
    }
  }

  const response = await tenantRoutes.handleRequest(request);
  return withCors(response);
};

export default {
  async fetch(request: Request, environment: Environment): Promise<Response> {
    const nodeEnvironment = environment.NODE_ENV ?? "development";

    // Resolve all bound secrets
    const [
      databaseUrl,
      neonApiKey,
      neonProjectId,
      adminApiKey,
      cloudflareApiToken,
      cloudflareZoneId,
    ] = await Promise.all([
      resolveSecret(environment.DATABASE_URL),
      resolveSecret(environment.NEON_API_KEY),
      resolveSecret(environment.NEON_PROJECT_ID),
      resolveSecret(environment.ADMIN_API_KEY),
      resolveSecret(environment.CLOUDFLARE_API_TOKEN),
      resolveSecret(environment.CLOUDFLARE_ZONE_ID),
    ]);

    const resolvedEnvironment: ResolvedEnvironment = {
      ...environment,
      DATABASE_URL: databaseUrl!,
      NEON_API_KEY: neonApiKey,
      NEON_PROJECT_ID: neonProjectId,
      ADMIN_API_KEY: adminApiKey,
      CLOUDFLARE_API_TOKEN: cloudflareApiToken,
      CLOUDFLARE_ZONE_ID: cloudflareZoneId,
    };

    const logger = createLogger({
      logLevel: environment.LOG_LEVEL,
      nodeEnv: nodeEnvironment,
    });

    const database = createDatabase(databaseUrl, nodeEnvironment);
    const tenantRepository = new TenantRepository(database);
    const tenantService = new TenantService(tenantRepository, {
      logger,
      neonApiKey,
      neonProjectId,
    });
    const tenantRoutes = createTenantRoutes({ logger, tenantService });

    try {
      return await handleRequest(
        request,
        tenantRoutes,
        resolvedEnvironment,
        logger,
      );
    } catch (error: unknown) {
      logger.error({ error }, "Unhandled error in server");
      return new Response("Internal server error", { status: 500 });
    }
  },
};
