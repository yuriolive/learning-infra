-- Drop existing enums if they exist (safe because table won't exist on first run)
DROP TYPE IF EXISTS "public"."tenant_status" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."tenant_plan" CASCADE;
--> statement-breakpoint
-- Create enum types
CREATE TYPE "public"."tenant_plan" AS ENUM('free', 'starter', 'professional', 'enterprise');
--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('provisioning', 'active', 'suspended', 'deleted', 'provisioning_failed');
--> statement-breakpoint
-- Create tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"merchant_email" text NOT NULL,
	"subdomain" text,
	"database_url" text,
	"api_url" text,
	"status" "tenant_status" DEFAULT 'provisioning' NOT NULL,
	"plan" "tenant_plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain")
);
