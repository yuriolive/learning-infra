import { captureError, initAnalytics } from "@vendin/analytics";
import { cache } from "@vendin/cache";
import { createCloudflareLogger } from "@vendin/logger/cloudflare";
import { createWebhookRoutes, WhatsappWebhookService } from "@vendin/whatsapp";

import {
  resolveEnvironmentSecrets,
  validateConfiguration,
  type Environment,
} from "./config";
import { createDatabase } from "./database/database";
import { createInternalRoutes } from "./domains/internal/internal.routes";
import { ProvisioningService } from "./domains/provisioning/provisioning.service";
import { TenantRepository } from "./domains/tenants/tenant.repository";
import { createTenantRoutes } from "./domains/tenants/tenant.routes";
import { TenantService } from "./domains/tenants/tenant.service";
import { createAuthMiddleware, wrapResponse } from "./middleware";
import { generateOpenAPISpec } from "./openapi/generator";

async function getOpenAPISpec(origin: string) {
  const cacheKey = `openapi-spec:${origin}`;
  let spec = await cache.get<ReturnType<typeof generateOpenAPISpec>>(cacheKey);

  if (!spec) {
    spec = generateOpenAPISpec(origin);
    await cache.set(cacheKey, spec, { ttlSeconds: 3600 });
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

async function handleApiRequest(
  request: Request,
  url: URL,
  origin: string,
  tenantRoutes: ReturnType<typeof createTenantRoutes>,
  internalRoutes: ReturnType<typeof createInternalRoutes>,
  webhookRoutes?: ReturnType<typeof createWebhookRoutes>,
): Promise<Response> {
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
    const spec = await getOpenAPISpec(origin);
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

  if (url.pathname.startsWith("/webhooks/") && webhookRoutes) {
    return webhookRoutes.handleRequest(request);
  }

  if (url.pathname.startsWith("/internal/")) {
    return internalRoutes.handleRequest(request);
  }

  return tenantRoutes.handleRequest(request);
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
  logger: ReturnType<typeof createCloudflareLogger>,
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

interface AppState {
  logger: ReturnType<typeof createCloudflareLogger>;
  middlewareOptions: ReturnType<typeof createMiddlewareOptions>;
  services: ReturnType<typeof createServices>;
  whatsappAppSecret: string | undefined;
  whatsappVerifyToken: string | undefined;
}

interface AppInitializationError {
  logger: ReturnType<typeof createCloudflareLogger>;
  middlewareOptions: ReturnType<typeof createMiddlewareOptions>;
  errorResponse: Response;
}

let initializationPromise: Promise<AppState | AppInitializationError> | null =
  null;

export function resetInitialization() {
  initializationPromise = null;
}

async function initializeApplication(
  environment: Environment,
  context?: {
    waitUntil: (promise: Promise<unknown>) => void;
  },
) {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const nodeEnvironment = environment.NODE_ENV ?? "development";
      const logger = createCloudflareLogger({
        logLevel: environment.LOG_LEVEL,
        nodeEnv: nodeEnvironment,
      });

      const {
        databaseUrl,
        neonApiKey,
        neonProjectId,
        adminApiKey,
        postHogApiKey,
        upstashRedisUrl,
        googleApplicationCredentials,
        cloudRunServiceAccount,
        geminiApiKey,
        cloudflareApiToken,
        cloudflareZoneId,
        tenantBaseDomain,
        storefrontHostname,
        whatsappAppSecret,
        whatsappVerifyToken,
      } = await resolveEnvironmentSecrets(environment);

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
        upstashRedisUrl,
        neonApiKey,
        neonProjectId,
        environment.GCP_PROJECT_ID,
        environment.GCP_REGION,
        environment.TENANT_IMAGE_TAG,
        googleApplicationCredentials,
        cloudRunServiceAccount,
        geminiApiKey,
        cloudflareApiToken,
        cloudflareZoneId,
        tenantBaseDomain,
        storefrontHostname,
      );

      if (configError) {
        return { logger, middlewareOptions, errorResponse: configError };
      }

      initApplicationAnalytics(postHogApiKey, environment.POSTHOG_HOST);

      const services = createServices(
        logger,
        databaseUrl as string,
        nodeEnvironment,
        environment,
        neonApiKey,
        neonProjectId,
        googleApplicationCredentials,
        upstashRedisUrl,
        cloudRunServiceAccount,
        geminiApiKey,
        cloudflareApiToken,
        cloudflareZoneId,
        tenantBaseDomain,
        storefrontHostname,
      );

      return {
        logger,
        middlewareOptions,
        services,
        whatsappAppSecret,
        whatsappVerifyToken,
      };
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  const result = await initializationPromise;

  if ("errorResponse" in result) {
    return result;
  }

  const {
    logger,
    middlewareOptions,
    services,
    whatsappAppSecret,
    whatsappVerifyToken,
  } = result;

  const routes = createApplicationRoutes({
    logger,
    tenantService: services.tenantService,
    provisioningService: services.provisioningService,
    database: services.database,
    whatsappWebhookService: services.whatsappWebhookService,
    whatsappAppSecret,
    whatsappVerifyToken,
    waitUntil: context?.waitUntil?.bind(context),
  });

  return {
    logger,
    middlewareOptions,
    services,
    routes,
  };
}

function createApplicationRoutes(context: {
  logger: ReturnType<typeof createCloudflareLogger>;
  tenantService: TenantService;
  provisioningService: ProvisioningService;
  database: ReturnType<typeof createDatabase>;
  whatsappWebhookService: WhatsappWebhookService;
  whatsappAppSecret: string | undefined;
  whatsappVerifyToken: string | undefined;
  waitUntil: ((promise: Promise<unknown>) => void) | undefined;
}) {
  const {
    logger,
    tenantService,
    provisioningService,
    database,
    whatsappWebhookService,
    whatsappAppSecret,
    whatsappVerifyToken,
    waitUntil,
  } = context;

  const tenantRoutes = createTenantRoutes({
    logger,
    tenantService,
    ...(waitUntil ? { waitUntil } : {}),
  });

  const internalRoutes = createInternalRoutes({
    logger,
    tenantService,
    provisioningService,
    db: database,
  });

  const webhookRoutes =
    whatsappAppSecret && whatsappVerifyToken
      ? createWebhookRoutes({
          logger,
          whatsappWebhookService,
          appSecret: whatsappAppSecret,
          verifyToken: whatsappVerifyToken,
          ...(waitUntil ? { waitUntil } : {}),
        })
      : undefined;

  return { tenantRoutes, internalRoutes, webhookRoutes };
}

function createServices(
  logger: ReturnType<typeof createCloudflareLogger>,
  databaseUrl: string,
  nodeEnvironment: string,
  environment: Environment,
  neonApiKey: string | undefined,
  neonProjectId: string | undefined,
  googleApplicationCredentials: string | undefined,
  upstashRedisUrl: string | undefined,
  cloudRunServiceAccount: string | undefined,
  geminiApiKey: string | undefined,
  cloudflareApiToken: string | undefined,
  cloudflareZoneId: string | undefined,
  tenantBaseDomain: string | undefined,
  storefrontHostname: string | undefined,
) {
  const database = createDatabase(databaseUrl, nodeEnvironment);
  const tenantRepository = new TenantRepository(database);

  const provisioningService = new ProvisioningService(tenantRepository, {
    logger,
    neonApiKey,
    neonOrgId: neonProjectId,
    gcpCredentialsJson: googleApplicationCredentials,
    gcpProjectId: environment.GCP_PROJECT_ID,
    gcpRegion: environment.GCP_REGION,
    tenantImageTag: environment.TENANT_IMAGE_TAG,
    upstashRedisUrl,
    cloudRunServiceAccount,
    geminiApiKey,
    cloudflareApiToken,
    cloudflareZoneId,
    tenantBaseDomain,
    storefrontHostname,
  });

  const tenantService = new TenantService(
    tenantRepository,
    provisioningService,
    {
      logger,
      gcpProjectId: environment.GCP_PROJECT_ID,
      gcpRegion: environment.GCP_REGION,
      tenantBaseDomain,
    },
  );

  const whatsappWebhookService = new WhatsappWebhookService(
    tenantRepository,
    logger,
  );

  return {
    tenantService,
    provisioningService,
    database,
    whatsappWebhookService,
  };
}

export default {
  async fetch(
    request: Request,
    environment: Environment,
    context?: { waitUntil: (promise: Promise<unknown>) => void },
  ): Promise<Response> {
    const initResult = await initializeApplication(environment, context);

    if ("errorResponse" in initResult) return initResult.errorResponse;

    const { logger, middlewareOptions, routes } = initResult;
    const { tenantRoutes, internalRoutes, webhookRoutes } = routes;

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
        internalRoutes,
        webhookRoutes,
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
