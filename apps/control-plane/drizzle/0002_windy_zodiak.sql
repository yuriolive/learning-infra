CREATE TYPE "public"."upgrade_campaign_status" AS ENUM('pending', 'running', 'paused', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."upgrade_execution_status" AS ENUM('queued', 'snapshotting', 'migrating', 'deploying', 'verifying', 'completed', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TABLE "release_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"auto_promote" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_upgrade_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" "upgrade_execution_status" DEFAULT 'queued' NOT NULL,
	"logs" jsonb,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "upgrade_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_image_tag" text NOT NULL,
	"channel_id" text NOT NULL,
	"status" "upgrade_campaign_status" DEFAULT 'pending' NOT NULL,
	"batch_size" integer DEFAULT 10 NOT NULL,
	"failure_threshold_percent" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "release_channel_id" text DEFAULT 'stable';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "current_image_tag" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "neon_project_id" text;--> statement-breakpoint
ALTER TABLE "tenant_upgrade_executions" ADD CONSTRAINT "tenant_upgrade_executions_campaign_id_upgrade_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."upgrade_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_upgrade_executions" ADD CONSTRAINT "tenant_upgrade_executions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upgrade_campaigns" ADD CONSTRAINT "upgrade_campaigns_channel_id_release_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."release_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_release_channel_id_release_channels_id_fk" FOREIGN KEY ("release_channel_id") REFERENCES "public"."release_channels"("id") ON DELETE no action ON UPDATE no action;