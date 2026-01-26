import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  merchantEmail: z.string().email(),
  subdomain: z
    .string()
    .regex(
      // eslint-disable-next-line security/detect-unsafe-regex
      /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$/,
      "Invalid domain format",
    )
    .optional(),
  plan: z.enum(["free", "starter", "professional", "enterprise"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subdomain: z
    .string()
    .regex(
      // eslint-disable-next-line security/detect-unsafe-regex
      /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$/,
      "Invalid domain format",
    )
    .optional(),
  status: z
    .enum([
      "provisioning",
      "active",
      "suspended",
      "deleted",
      "provisioning_failed",
    ])
    .optional(),
  plan: z.enum(["free", "starter", "professional", "enterprise"]).optional(),
  databaseUrl: z.string().optional(),
  apiUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const tenantIdSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID format"),
});
