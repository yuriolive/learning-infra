import { captureError, initAnalytics } from "@vendin/analytics";
import { createLogger } from "@vendin/utils/logger";
import { LRUCache } from "lru-cache";

import { createDatabase } from "./database/database";
import { TenantRepository } from "./domains/tenants/tenant.repository";
import { createTenantRoutes } from "./domains/tenants/tenant.routes";
import { TenantService } from "./domains/tenants/tenant.service";
import { createAuthMiddleware, wrapResponse } from "./middleware";
import { generateOpenAPISpec } from "./openapi/generator";

import type { MiddlewareOptions } from "./middleware";

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
  POSTHOG_API_KEY?: BoundSecret;
  POSTHOG_HOST?: string;
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

function getDocumentationHtml() {
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
      },
    });
  }

  if (url.pathname === "/docs") {
    return new Response(getDocumentationHtml(), {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }

  return tenantRoutes.handleRequest(request);
}

async function resolveEnvironmentSecrets(environment: Environment) {
  return Promise.all([
    resolveSecret(environment.DATABASE_URL),
    resolveSecret(environment.NEON_API_KEY),
    resolveSecret(environment.NEON_PROJECT_ID),
    resolveSecret(environment.ADMIN_API_KEY),
    resolveSecret(environment.POSTHOG_API_KEY),
  ]);
}

export default {
  async fetch(request: Request, environment: Environment): Promise<Response> {
    const nodeEnvironment = environment.NODE_ENV ?? "development";
    const logger = createLogger({
      logLevel: environment.LOG_LEVEL,
      nodeEnv: nodeEnvironment,
    });

    const [databaseUrl, neonApiKey, neonProjectId, adminApiKey, postHogApiKey] =
      await resolveEnvironmentSecrets(environment);

    if (postHogApiKey) {
      initAnalytics(
        postHogApiKey,
        environment.POSTHOG_HOST ? { host: environment.POSTHOG_HOST } : {},
      );
    }

    const middlewareOptions: MiddlewareOptions = {
      logger,
      adminApiKey,
      nodeEnv: nodeEnvironment,
      allowedOrigins: environment.ALLOWED_ORIGINS
        ? environment.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
        : [],
    };

    // Enforce ADMIN_API_KEY in production
    if (nodeEnvironment === "production" && !adminApiKey) {
      logger.error(
        "ADMIN_API_KEY is required in production but was not configured",
      );
      return new Response(
        JSON.stringify({
          error: "Configuration Error",
          message: "Service is not properly configured",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const database = createDatabase(databaseUrl, nodeEnvironment);
    const tenantRepository = new TenantRepository(database);
    const tenantService = new TenantService(tenantRepository, {
      logger,
      neonApiKey,
      neonProjectId,
    });
    const tenantRoutes = createTenantRoutes({ logger, tenantService });

    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;

    try {
      // Handle OPTIONS preflight requests
      if (request.method === "OPTIONS") {
        const response = new Response(null, { status: 204 });
        return wrapResponse(response, request, middlewareOptions);
      }

      // Apply Auth Middleware for /api/tenants/*
      if (url.pathname.startsWith("/api/tenants")) {
        const authMiddleware = createAuthMiddleware(middlewareOptions);
        const authResponse = authMiddleware(request);
        if (authResponse) {
          return wrapResponse(authResponse, request, middlewareOptions);
        }
      }

      const response = await handleApiRequest(
        request,
        url,
        origin,
        tenantRoutes,
      );
      return wrapResponse(response, request, middlewareOptions);
    } catch (error: unknown) {
      logger.error({ error }, "Unhandled error in server");
      captureError(error, {
        path: url.pathname,
        method: request.method,
      });
      const errorResponse = new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
      return wrapResponse(errorResponse, request, middlewareOptions);
    }
  },
};
