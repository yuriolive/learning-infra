import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import {
  createTenantSchema,
  updateTenantSchema,
} from "../domains/tenants/tenant.schemas";

const registry = new OpenAPIRegistry();

// Define schemas
const tenantStatusSchema = z.enum(["active", "suspended", "deleted"]);

const tenantSchema = registry.register(
  "Tenant",
  z.object({
    id: z.string().uuid().openapi({ description: "Unique tenant identifier" }),
    name: z.string().openapi({ description: "Tenant name" }),
    subdomain: z
      .string()
      .nullable()
      .optional()
      .openapi({ description: "Tenant unique subdomain (optional)" }),
    status: tenantStatusSchema.openapi({ description: "Tenant status" }),
    createdAt: z
      .string()
      .datetime()
      .openapi({ description: "Creation timestamp" }),
    updatedAt: z
      .string()
      .datetime()
      .openapi({ description: "Last update timestamp" }),
    deletedAt: z
      .string()
      .datetime()
      .nullable()
      .optional()
      .openapi({ description: "Deletion timestamp (if soft-deleted)" }),
    metadata: z
      .record(z.unknown())
      .optional()
      .openapi({ description: "Additional metadata (key-value pairs)" }),
  }),
);

const errorSchema = registry.register(
  "Error",
  z.object({
    error: z.string().openapi({ description: "Error message" }),
    details: z
      .array(
        z.object({
          path: z.array(z.union([z.string(), z.number()])),
          message: z.string(),
        }),
      )
      .optional()
      .openapi({ description: "Validation error details" }),
  }),
);

const successSchema = registry.register(
  "Success",
  z.object({
    success: z.boolean().openapi({ description: "Operation success status" }),
  }),
);

// Health endpoint
registry.registerPath({
  method: "get",
  path: "/health",
  summary: "Health check",
  description: "Returns the health status of the API",
  tags: ["Health"],
  responses: {
    200: {
      description: "API is healthy",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            timestamp: z.string().datetime(),
          }),
        },
      },
    },
  },
});

// Create tenant
registry.registerPath({
  method: "post",
  path: "/api/tenants",
  summary: "Create tenant",
  description: "Creates a new tenant in the system",
  tags: ["Tenants"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTenantSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Tenant created successfully",
      content: {
        "application/json": {
          schema: tenantSchema,
        },
      },
    },
    400: {
      description: "Validation error",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    409: {
      description: "Subdomain already in use",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
  },
});

// List tenants
registry.registerPath({
  method: "get",
  path: "/api/tenants",
  summary: "List tenants",
  description: "Retrieves a list of all tenants",
  tags: ["Tenants"],
  responses: {
    200: {
      description: "List of tenants",
      content: {
        "application/json": {
          schema: z.array(tenantSchema),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
  },
});

// Get tenant by ID
registry.registerPath({
  method: "get",
  path: "/api/tenants/{tenantId}",
  summary: "Get tenant",
  description: "Retrieves a specific tenant by ID",
  tags: ["Tenants"],
  request: {
    params: z.object({
      tenantId: z.string().uuid().openapi({ description: "Tenant ID" }),
    }),
  },
  responses: {
    200: {
      description: "Tenant details",
      content: {
        "application/json": {
          schema: tenantSchema,
        },
      },
    },
    400: {
      description: "Invalid tenant ID format",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    404: {
      description: "Tenant not found",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
  },
});

// Update tenant
registry.registerPath({
  method: "patch",
  path: "/api/tenants/{tenantId}",
  summary: "Update tenant",
  description: "Updates an existing tenant (supports partial updates)",
  tags: ["Tenants"],
  request: {
    params: z.object({
      tenantId: z.string().uuid().openapi({ description: "Tenant ID" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateTenantSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Tenant updated successfully",
      content: {
        "application/json": {
          schema: tenantSchema,
        },
      },
    },
    400: {
      description: "Validation error",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    404: {
      description: "Tenant not found",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    409: {
      description: "Subdomain already in use",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
  },
});

// Delete tenant
registry.registerPath({
  method: "delete",
  path: "/api/tenants/{tenantId}",
  summary: "Delete tenant",
  description: "Soft deletes a tenant (marks as deleted with cleanup)",
  tags: ["Tenants"],
  request: {
    params: z.object({
      tenantId: z.string().uuid().openapi({ description: "Tenant ID" }),
    }),
  },
  responses: {
    200: {
      description: "Tenant deleted successfully",
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
    },
    400: {
      description: "Invalid tenant ID format",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    404: {
      description: "Tenant not found",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateOpenAPISpec = (serverUrl: string): any => {
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Vendin Control Plane API",
      version: "0.1.0",
      description:
        "Orchestrator API for managing tenant provisioning in the multi-tenant e-commerce platform. Each merchant gets a dedicated backend and database.",
      contact: {
        name: "Vendin",
      },
    },
    servers: [
      {
        url: serverUrl,
        description: "Server",
      },
    ],
    tags: [
      {
        name: "Health",
        description: "Health check endpoints",
      },
      {
        name: "Tenants",
        description: "Tenant management operations",
      },
    ],
  });
};
