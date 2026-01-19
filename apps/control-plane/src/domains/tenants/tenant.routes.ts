import { ZodError } from "zod";

import { createTenantSchema, tenantIdSchema, updateTenantSchema } from "./tenant.schemas";
import { TenantService } from "./tenant.service";

import type { CreateTenantInput, UpdateTenantInput } from "./tenant.types";

export interface RouteContext {
  tenantService: TenantService;
}

export function createTenantRoutes(context: RouteContext) {
  const { tenantService } = context;

  return {
    async handleRequest(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/").filter(Boolean);

      if (pathParts.length === 2 && pathParts[0] === "api" && pathParts[1] === "tenants") {
        if (request.method === "POST") {
          return handleCreateTenant(request, tenantService);
        }
        if (request.method === "GET") {
          return handleListTenants(tenantService);
        }
      }

      if (pathParts.length === 3 && pathParts[0] === "api" && pathParts[1] === "tenants") {
        const tenantId = pathParts[2];

        if (request.method === "GET") {
          return handleGetTenant(tenantId, tenantService);
        }
        if (request.method === "DELETE") {
          return handleDeleteTenant(tenantId, tenantService);
        }
        if (request.method === "PATCH" || request.method === "PUT") {
          return handleUpdateTenant(tenantId, request, tenantService);
        }
      }

      return new Response("Not found", { status: 404 });
    },
  };
}

async function handleCreateTenant(request: Request, service: TenantService): Promise<Response> {
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
    return handleError(error);
  }
}

async function handleGetTenant(tenantId: string, service: TenantService): Promise<Response> {
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
    return handleError(error);
  }
}

async function handleListTenants(service: TenantService): Promise<Response> {
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
    return handleError(error);
  }
}

async function handleUpdateTenant(
  tenantId: string,
  request: Request,
  service: TenantService
): Promise<Response> {
  try {
    tenantIdSchema.parse({ tenantId });

    const body = await request.json();
    const validated = updateTenantSchema.parse(body);

    const tenant = await service.updateTenant(tenantId, validated as UpdateTenantInput);

    return new Response(JSON.stringify(tenant), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

async function handleDeleteTenant(tenantId: string, service: TenantService): Promise<Response> {
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
    return handleError(error);
  }
}

function handleError(error: unknown): Response {
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
      }
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

  console.error("Unhandled error:", error);
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
