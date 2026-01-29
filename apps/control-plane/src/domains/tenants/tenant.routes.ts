import { ZodError } from "zod";

import {
  SubdomainInUseError,
  SubdomainRequiredError,
  TenantNotFoundError,
} from "./tenant.errors";
import {
  createTenantSchema,
  tenantIdSchema,
  updateTenantSchema,
} from "./tenant.schemas";

import type { TenantService } from "./tenant.service";
import type { CreateTenantInput, UpdateTenantInput } from "./tenant.types";
import type { Logger } from "@vendin/utils/logger";

export interface RouteContext {
  logger: Logger;
  tenantService: TenantService;
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Creates tenant route handlers.
 * Factory function that creates a route handler object for tenant management endpoints.
 * Handles routing for POST /api/tenants, GET /api/tenants, GET /api/tenants/:id,
 * PATCH /api/tenants/:id, and DELETE /api/tenants/:id.
 * @param context - Route context containing logger and tenant service
 * @returns Object with handleRequest method for processing HTTP requests
 */
export function createTenantRoutes(context: RouteContext) {
  const { logger, tenantService, waitUntil } = context;

  return {
    async handleRequest(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/").filter(Boolean);

      if (
        pathParts.length === 2 &&
        pathParts[0] === "api" &&
        pathParts[1] === "tenants"
      ) {
        const response = await handleCollectionRequest(
          request,
          tenantService,
          logger,
          waitUntil,
        );
        return response;
      }

      if (
        pathParts.length === 3 &&
        pathParts[0] === "api" &&
        pathParts[1] === "tenants"
      ) {
        const tenantId = pathParts[2] as string;
        const response = await handleResourceRequest(
          request,
          tenantId,
          tenantService,
          logger,
        );
        return response;
      }

      return new Response("Not found", { status: 404 });
    },
  };
}

async function handleCollectionRequest(
  request: Request,
  service: TenantService,
  logger: Logger,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<Response> {
  if (request.method === "POST") {
    const response = await handleCreateTenant(
      request,
      service,
      logger,
      waitUntil,
    );
    return response;
  }
  if (request.method === "GET") {
    const response = await handleListTenants(service, logger);
    return response;
  }
  return new Response("Not found", { status: 404 });
}

async function handleResourceRequest(
  request: Request,
  tenantId: string,
  service: TenantService,
  logger: Logger,
): Promise<Response> {
  if (request.method === "GET") {
    const response = await handleGetTenant(tenantId, service, logger);
    return response;
  }
  if (request.method === "DELETE") {
    const response = await handleDeleteTenant(tenantId, service, logger);
    return response;
  }
  if (request.method === "PATCH" || request.method === "PUT") {
    const response = await handleUpdateTenant(
      tenantId,
      request,
      service,
      logger,
    );
    return response;
  }
  return new Response("Not found", { status: 404 });
}

/**
 * Creates a new tenant in the system.
 * Creates a tenant with the provided name, subdomain, and optional metadata.
 * Validates input using Zod schema and returns the created tenant with generated ID and timestamps.
 * @param request - HTTP request containing tenant data in JSON body
 * @param service - Tenant service instance for business logic
 * @param logger - Logger instance for error tracking
 * @param waitUntil - Optional callback to schedule background work
 * @returns HTTP response with created tenant (201) or error (400/409/500)
 * @throws ZodError when validation fails (returns 400)
 * @example
 * ```json
 * POST /api/tenants
 * {
 *   "name": "My Store",
 *   "subdomain": "mystore",
 *   "metadata": { "customField": "value" }
 * }
 * ```
 */
async function handleCreateTenant(
  request: Request,
  service: TenantService,
  logger: Logger,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<Response> {
  try {
    const body = await request.json();
    const validated = createTenantSchema.parse(body);

    const tenant = await service.createTenant(
      validated as CreateTenantInput,
      waitUntil,
    );

    return new Response(JSON.stringify(tenant), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleError(error, logger);
  }
}

/**
 * Retrieves a specific tenant by ID.
 * Fetches tenant details including status, metadata, and timestamps.
 * Validates tenant ID format (UUID) before querying the database.
 * @param tenantId - UUID of the tenant to retrieve
 * @param service - Tenant service instance for data access
 * @param logger - Logger instance for error tracking
 * @returns HTTP response with tenant data (200) or error (400/404/500)
 * @throws ZodError when tenant ID format is invalid (returns 400)
 * @example
 * ```bash
 * GET /api/tenants/123e4567-e89b-12d3-a456-426614174000
 * ```
 */
async function handleGetTenant(
  tenantId: string,
  service: TenantService,
  logger: Logger,
): Promise<Response> {
  try {
    tenantIdSchema.parse({ tenantId });

    const tenant = await service.getTenant(tenantId);

    return new Response(JSON.stringify(tenant), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleError(error, logger);
  }
}

/**
 * Lists all tenants in the system.
 * Retrieves a list of all tenants, including active, suspended, and soft-deleted tenants.
 * Returns an array of tenant objects with their complete details.
 * @param service - Tenant service instance for data access
 * @param logger - Logger instance for error tracking
 * @returns HTTP response with array of tenants (200) or error (500)
 * @example
 * ```bash
 * GET /api/tenants
 * ```
 */
async function handleListTenants(
  service: TenantService,
  logger: Logger,
): Promise<Response> {
  try {
    const tenants = await service.listTenants();

    return new Response(JSON.stringify(tenants), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleError(error, logger);
  }
}

/**
 * Updates an existing tenant.
 * Performs a partial update of tenant properties. Supports updating name, subdomain, status, and metadata.
 * Validates both tenant ID format and update payload before processing.
 * @param tenantId - UUID of the tenant to update
 * @param request - HTTP request containing update data in JSON body
 * @param service - Tenant service instance for business logic
 * @param logger - Logger instance for error tracking
 * @returns HTTP response with updated tenant (200) or error (400/404/409/500)
 * @throws ZodError when validation fails (returns 400)
 * @example
 * ```json
 * PATCH /api/tenants/123e4567-e89b-12d3-a456-426614174000
 * {
 *   "name": "Updated Store Name",
 *   "status": "suspended"
 * }
 * ```
 */
async function handleUpdateTenant(
  tenantId: string,
  request: Request,
  service: TenantService,
  logger: Logger,
): Promise<Response> {
  try {
    tenantIdSchema.parse({ tenantId });

    const body = await request.json();
    const validated = updateTenantSchema.parse(body);

    const tenant = await service.updateTenant(
      tenantId,
      validated as UpdateTenantInput,
    );

    return new Response(JSON.stringify(tenant), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleError(error, logger);
  }
}

/**
 * Soft deletes a tenant.
 * Marks a tenant as deleted and performs cleanup operations. This is a soft delete,
 * meaning the tenant record remains in the database but is marked with a deletion timestamp.
 * @param tenantId - UUID of the tenant to delete
 * @param service - Tenant service instance for business logic
 * @param logger - Logger instance for error tracking
 * @returns HTTP response with success status (200) or error (400/404/500)
 * @throws ZodError when tenant ID format is invalid (returns 400)
 * @example
 * ```bash
 * DELETE /api/tenants/123e4567-e89b-12d3-a456-426614174000
 * ```
 */
async function handleDeleteTenant(
  tenantId: string,
  service: TenantService,
  logger: Logger,
): Promise<Response> {
  try {
    tenantIdSchema.parse({ tenantId });

    await service.deleteTenant(tenantId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleError(error, logger);
  }
}

/**
 * Handles errors from route handlers.
 * Centralized error handling that converts different error types into appropriate HTTP responses.
 * Handles validation errors (ZodError), not found errors, conflict errors, and generic errors.
 * @param error - The error to handle (can be ZodError, Error, or unknown)
 * @param logger - Logger instance for logging unhandled errors
 * @returns HTTP response with appropriate status code and error message
 */
function handleError(error: unknown, logger: Logger): Response {
  if (error instanceof ZodError) {
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details: error.errors,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  if (error instanceof TenantNotFoundError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  if (error instanceof SubdomainInUseError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 409,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  if (error instanceof SubdomainRequiredError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  logger.error({ error }, "Unhandled error in tenant routes");
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
