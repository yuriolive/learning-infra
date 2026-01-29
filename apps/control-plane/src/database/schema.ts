import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", [
  "provisioning",
  "active",
  "suspended",
  "deleted",
  "provisioning_failed",
]);

export const tenantPlanEnum = pgEnum("tenant_plan", [
  "free",
  "starter",
  "professional",
  "enterprise",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  merchantEmail: text("merchant_email").notNull(),
  subdomain: text("subdomain").unique(), // This is the tenant's unique subdomain (e.g., "my-store")
  databaseUrl: text("database_url"),
  apiUrl: text("api_url"),
  redisHash: text("redis_hash"),
  status: tenantStatusEnum("status").notNull().default("provisioning"),
  plan: tenantPlanEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});
