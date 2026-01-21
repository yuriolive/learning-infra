DO $$ BEGIN
 BEGIN
  CREATE TYPE "public"."tenant_plan" AS ENUM('free', 'starter', 'professional', 'enterprise');
 EXCEPTION
  WHEN duplicate_object THEN null;
 END;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 BEGIN
  CREATE TYPE "public"."tenant_status" AS ENUM('provisioning', 'active', 'suspended', 'deleted', 'provisioning_failed');
 EXCEPTION
  WHEN duplicate_object THEN null;
 END;
END $$;
--> statement-breakpoint
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
