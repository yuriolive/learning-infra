import { captureError, initAnalytics } from "@vendin/analytics";
import { createLogger } from "@vendin/utils/logger";
import { LRUCache } from "lru-cache";

import { createDatabase } from "./database/database";
import { TenantRepository } from "./domains/tenants/tenant.repository";
import { createTenantRoutes } from "./domains/tenants/tenant.routes";
import { TenantService } from "./domains/tenants/tenant.service";
import { createAuthMiddleware, wrapResponse } from "./middleware";
import { generateOpenAPISpec } from "./openapi/generator";

interface SecretBinding {
  get(): Promise<string>;
}

type BoundSecret = string | SecretBinding;

export interface Environment {
  DATABASE_URL: BoundSecret;
  LOG_LEVEL?: string;
  NODE_ENV?: string;
  NEON_API_KEY?: BoundSecret;
  NEON_PROJECT_ID?: BoundSecret;
  ADMIN_API_KEY?: BoundSecret;
  ALLOWED_ORIGINS?: string;
  POSTHOG_API_KEY?: BoundSecret;
  POSTHOG_HOST?: string;
  GCP_PROJECT_ID?: string;
  GCP_REGION?: string;
  TENANT_IMAGE_TAG?: string;
  UPSTASH_REDIS_URL?: BoundSecret;
  GOOGLE_APPLICATION_CREDENTIALS?: BoundSecret;
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
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.43.14"></script>
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

function resolveEnvironmentSecrets(environment: Environment) {
  return Promise.all([
    resolveSecret(environment.DATABASE_URL),
    resolveSecret(environment.NEON_API_KEY),
    resolveSecret(environment.NEON_PROJECT_ID),
    resolveSecret(environment.ADMIN_API_KEY),
    resolveSecret(environment.POSTHOG_API_KEY),
    resolveSecret(environment.UPSTASH_REDIS_URL),
    resolveSecret(environment.GOOGLE_APPLICATION_CREDENTIALS),
  ]);
}

function initApplicationAnalytics(
  postHogApiKey: string | undefined,
  postHogHost: string | undefined,
) {
  if (postHogApiKey) {
    initAnalytics(
      postHogApiKey,
      postHogHost ? { host: postHogHost } : undefined,
    );
  }
}

function createMiddlewareOptions(
  logger: ReturnType<typeof createLogger>,
  adminApiKey: string | undefined,
  nodeEnvironment: string,
  allowedOrigins: string | undefined,
) {
  return {
    logger,
    adminApiKey,
    nodeEnv: nodeEnvironment,
    allowedOrigins: allowedOrigins
      ? allowedOrigins.split(",").map((o) => o.trim())
      : [],
  };
}

function createServices(
  logger: ReturnType<typeof createLogger>,
  databaseUrl: string,
  nodeEnvironment: string,
  environment: Environment,
  neonApiKey: string | undefined,
  neonProjectId: string | undefined,
  googleApplicationCredentials: string | undefined,
) {
  const database = createDatabase(databaseUrl, nodeEnvironment);
  const tenantRepository = new TenantRepository(database);
  const tenantService = new TenantService(tenantRepository, {
    logger,
    neonApiKey,
    neonProjectId,
    gcpCredentialsJson: googleApplicationCredentials,
    gcpProjectId: environment.GCP_PROJECT_ID,
    gcpRegion: environment.GCP_REGION,
    tenantImageTag: environment.TENANT_IMAGE_TAG,
    upstashRedisUrl: environment.UPSTASH_REDIS_URL as string | undefined,
  });
  return { tenantService };
}

function validateConfiguration(
  logger: ReturnType<typeof createLogger>,
  databaseUrl: string | undefined,
  adminApiKey: string | undefined,
  nodeEnvironment: string,
): Response | undefined {
  if (!databaseUrl) {
    logger.error("DATABASE_URL is required but was not configured");
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: "Database configuration is missing",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

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

  return undefined;
}

export default {
  async fetch(
    request: Request,
    environment: Environment,
    context?: { waitUntil: (promise: Promise<unknown>) => void },
  ): Promise<Response> {
    const nodeEnvironment = environment.NODE_ENV ?? "development";
    const logger = createLogger({
      logLevel: environment.LOG_LEVEL,
      nodeEnv: nodeEnvironment,
    });

    const [
      databaseUrl,
      neonApiKey,
      neonProjectId,
      adminApiKey,
      postHogApiKey,
      _upstashRedisUrl,
      googleApplicationCredentials,
    ] = await resolveEnvironmentSecrets(environment);

    initApplicationAnalytics(postHogApiKey, environment.POSTHOG_HOST);

    const middlewareOptions = createMiddlewareOptions(
      logger,
      adminApiKey,
      nodeEnvironment,
      environment.ALLOWED_ORIGINS,
    );

    const configError = validateConfiguration(
      logger,
      databaseUrl,
      adminApiKey,
      nodeEnvironment,
    );
    if (configError) return configError;

    const { tenantService } = createServices(
      logger,
      databaseUrl as string,
      nodeEnvironment,
      environment,
      neonApiKey,
      neonProjectId,
      googleApplicationCredentials,
    );

    const tenantRoutes = createTenantRoutes({
      logger,
      tenantService,
      ...(context?.waitUntil
        ? { waitUntil: context.waitUntil.bind(context) }
        : {}),
    });

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
