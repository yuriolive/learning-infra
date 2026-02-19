import { relations } from "drizzle-orm";
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

export const whatsappProviderEnum = pgEnum("whatsapp_provider", ["facebook"]);

export const tenantAdminRoleEnum = pgEnum("tenant_admin_role", [
  "owner",
  "admin",
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
  failureReason: text("failure_reason"),
  jwtSecret: text("jwt_secret").notNull(),
  cookieSecret: text("cookie_secret").notNull(),
  whatsappPhoneNumber: text("whatsapp_phone_number").unique(),
  whatsappPhoneId: text("whatsapp_phone_id"),
  whatsappProvider:
    whatsappProviderEnum("whatsapp_provider").default("facebook"),
  whatsappVerifiedAt: timestamp("whatsapp_verified_at"),
});

export const tenantAdmins = pgTable("tenant_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  phone: text("phone").notNull().unique(),
  role: tenantAdminRoleEnum("role").default("owner"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tenantProvisioningEvents = pgTable("tenant_provisioning_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  step: text("step").notNull(),
  status: text("status").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  provisioningEvents: many(tenantProvisioningEvents),
  admins: many(tenantAdmins),
}));

export const tenantAdminsRelations = relations(tenantAdmins, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantAdmins.tenantId],
    references: [tenants.id],
  }),
}));

export const tenantProvisioningEventsRelations = relations(
  tenantProvisioningEvents,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [tenantProvisioningEvents.tenantId],
      references: [tenants.id],
    }),
  }),
);
