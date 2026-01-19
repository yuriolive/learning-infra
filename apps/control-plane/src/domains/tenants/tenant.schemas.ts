import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/, "Invalid domain format").optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/, "Invalid domain format").optional(),
  status: z.enum(["active", "suspended", "deleted"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const tenantIdSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID format"),
});
