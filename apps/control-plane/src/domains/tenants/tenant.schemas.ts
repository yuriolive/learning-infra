import { subdomainSchema } from "@vendin/utils";
import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  merchantEmail: z.string().email(),
  subdomain: subdomainSchema,
  plan: z.enum(["free", "starter", "professional", "enterprise"]).optional(),
  metadata: z.record(z.unknown()).optional(),
  whatsappPhoneNumber: z.string().nullable().optional(),
  whatsappPhoneId: z.string().nullable().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subdomain: subdomainSchema,
  metadata: z.record(z.unknown()).optional(),
  whatsappPhoneNumber: z.string().nullable().optional(),
  whatsappPhoneId: z.string().nullable().optional(),
  whatsappProvider: z.enum(["facebook", "twilio"]).nullable().optional(),
});

export const adminUpdateTenantSchema = updateTenantSchema.extend({
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
  redisHash: z.string().optional(),
  failureReason: z.string().optional(),
  whatsappVerifiedAt: z.coerce.date().nullable().optional(),
  releaseChannelId: z.string().nullable().optional(),
  currentImageTag: z.string().nullable().optional(),
  lockedUntil: z.coerce.date().nullable().optional(),
  jwtSecret: z.string().optional(),
  cookieSecret: z.string().optional(),
  neonProjectId: z.string().nullable().optional(),
});

export const tenantIdSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID format"),
});
