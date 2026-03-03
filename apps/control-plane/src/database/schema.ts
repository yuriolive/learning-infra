import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
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

export const whatsappProviderEnum = pgEnum("whatsapp_provider", [
  "facebook",
  "twilio",
]);

export const tenantAdminRoleEnum = pgEnum("tenant_admin_role", [
  "owner",
  "admin",
]);

export const upgradeCampaignStatusEnum = pgEnum("upgrade_campaign_status", [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
]);

export const upgradeExecutionStatusEnum = pgEnum("upgrade_execution_status", [
  "queued",
  "snapshotting",
  "migrating",
  "deploying",
  "verifying",
  "completed",
  "failed",
  "rolled_back",
]);

export const releaseChannels = pgTable("release_channels", {
  id: text("id").primaryKey(), // e.g., 'canary', 'internal', 'stable'
  autoPromote: boolean("auto_promote").default(false).notNull(),
  // The image tag currently live on this channel (updated when a campaign completes)
  currentImageTag: text("current_image_tag"),
  // Next channel in the promotion chain (e.g. internal → canary → stable)
  nextChannelId: text("next_channel_id").references(
    (): AnyPgColumn => releaseChannels.id,
    { onDelete: "set null" },
  ),
});

export const upgradeCampaigns = pgTable(
  "upgrade_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetImageTag: text("target_image_tag").notNull(),
    channelId: text("channel_id")
      .notNull()
      .references(() => releaseChannels.id),
    status: upgradeCampaignStatusEnum("status").notNull().default("pending"),
    batchSize: integer("batch_size").notNull().default(10),
    failureThresholdPercent: integer("failure_threshold_percent")
      .notNull()
      .default(10),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    channelIdIdx: index("upgrade_campaigns_channel_id_idx").on(table.channelId),
  }),
);

export const tenants = pgTable(
  "tenants",
  {
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

    // New fields for upgrade system
    releaseChannelId: text("release_channel_id")
      .references(() => releaseChannels.id)
      .default("stable"),
    currentImageTag: text("current_image_tag"),
    lockedUntil: timestamp("locked_until"),
    neonProjectId: text("neon_project_id"),
  },
  (table) => ({
    releaseChannelIdIdx: index("tenants_release_channel_id_idx").on(
      table.releaseChannelId,
    ),
  }),
);

export const tenantUpgradeExecutions = pgTable(
  "tenant_upgrade_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => upgradeCampaigns.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    status: upgradeExecutionStatusEnum("status").notNull().default("queued"),
    logs: jsonb("logs").$type<unknown>(),
    startedAt: timestamp("started_at").defaultNow(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => ({
    campaignIdIdx: index("tenant_upgrade_executions_campaign_id_idx").on(
      table.campaignId,
    ),
    tenantIdIdx: index("tenant_upgrade_executions_tenant_id_idx").on(
      table.tenantId,
    ),
  }),
);

export const tenantAdmins = pgTable(
  "tenant_admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    phone: text("phone").notNull().unique(),
    role: tenantAdminRoleEnum("role").default("owner"),
    phoneVerifiedAt: timestamp("phone_verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index("tenant_admins_tenant_id_idx").on(table.tenantId),
  }),
);

export const tenantProvisioningEvents = pgTable(
  "tenant_provisioning_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    step: text("step").notNull(),
    status: text("status").notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index("tenant_provisioning_events_tenant_id_idx").on(
      table.tenantId,
    ),
  }),
);

export const releaseChannelsRelations = relations(
  releaseChannels,
  ({ one }) => ({
    nextChannel: one(releaseChannels, {
      fields: [releaseChannels.nextChannelId],
      references: [releaseChannels.id],
      relationName: "channel_promotion_chain",
    }),
  }),
);

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  provisioningEvents: many(tenantProvisioningEvents),
  admins: many(tenantAdmins),
  releaseChannel: one(releaseChannels, {
    fields: [tenants.releaseChannelId],
    references: [releaseChannels.id],
  }),
  upgradeExecutions: many(tenantUpgradeExecutions),
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

export const upgradeCampaignsRelations = relations(
  upgradeCampaigns,
  ({ one, many }) => ({
    channel: one(releaseChannels, {
      fields: [upgradeCampaigns.channelId],
      references: [releaseChannels.id],
    }),
    executions: many(tenantUpgradeExecutions),
  }),
);

export const tenantUpgradeExecutionsRelations = relations(
  tenantUpgradeExecutions,
  ({ one }) => ({
    campaign: one(upgradeCampaigns, {
      fields: [tenantUpgradeExecutions.campaignId],
      references: [upgradeCampaigns.id],
    }),
    tenant: one(tenants, {
      fields: [tenantUpgradeExecutions.tenantId],
      references: [tenants.id],
    }),
  }),
);
