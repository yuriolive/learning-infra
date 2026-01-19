import { ZodError } from "zod";

import {
  createTenantSchema,
  tenantIdSchema,
  updateTenantSchema,
} from "./tenant.schemas";

import type { TenantService } from "./tenant.service";
import type { CreateTenantInput, UpdateTenantInput } from "./tenant.types";
import type { Logger } from "@learning-infra/utils/logger";

export interface RouteContext {
  logger: Logger;
  tenantService: TenantService;
}

export function createTenantRoutes(context: RouteContext) {
  const { logger, tenantService } = context;

  return {
    async handleRequest(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/").filter(Boolean);

      if (
        pathParts.length === 2 &&
        pathParts[0] === "api" &&
        pathParts[1] === "tenants"
      ) {
        if (request.method === "POST") {
          return handleCreateTenant(request, tenantService, logger);
        }
        if (request.method === "GET") {
          return handleListTenants(tenantService, logger);
        }
      }

      if (
        pathParts.length === 3 &&
        pathParts[0] === "api" &&
        pathParts[1] === "tenants"
      ) {
        const tenantId = pathParts[2];
        if (!tenantId) {
          return new Response("Not found", { status: 404 });
        }

        if (request.method === "GET") {
          return handleGetTenant(tenantId, tenantService, logger);
        }
        if (request.method === "DELETE") {
          return handleDeleteTenant(tenantId, tenantService, logger);
        }
        if (request.method === "PATCH" || request.method === "PUT") {
          return handleUpdateTenant(tenantId, request, tenantService, logger);
        }
      }

      return new Response("Not found", { status: 404 });
    },
  };
}

async function handleCreateTenant(
  request: Request,
  service: TenantService,
  logger: Logger,
): Promise<Response> {
  try {
    const body = await request.json();
    const validated = createTenantSchema.parse(body);

    const tenant = await service.createTenant(validated as CreateTenantInput);

    return new Response(JSON.stringify(tenant), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return handleError(error, logger);
  }
}

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
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return handleError(error, logger);
  }
}

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
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return handleError(error, logger);
  }
}

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
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return handleError(error, logger);
  }
}

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
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return handleError(error, logger);
  }
}

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
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  if (error instanceof Error) {
    if (error.message === "Tenant not found") {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    if (error.message === "Domain already in use") {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }

  logger.error({ error }, "Unhandled error in tenant routes");
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
