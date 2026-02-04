CREATE TYPE "public"."tenant_plan" AS ENUM('free', 'starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('provisioning', 'active', 'suspended', 'deleted', 'provisioning_failed');--> statement-breakpoint
CREATE TABLE "tenant_provisioning_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"step" text NOT NULL,
	"status" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"merchant_email" text NOT NULL,
	"subdomain" text,
	"database_url" text,
	"api_url" text,
	"redis_hash" text,
	"status" "tenant_status" DEFAULT 'provisioning' NOT NULL,
	"plan" "tenant_plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"metadata" jsonb,
	"failure_reason" text,
	"jwt_secret" text NOT NULL,
	"cookie_secret" text NOT NULL,
	CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
ALTER TABLE "tenant_provisioning_events" ADD CONSTRAINT "tenant_provisioning_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;