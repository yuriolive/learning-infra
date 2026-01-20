CREATE TYPE "public"."tenant_plan" AS ENUM('free', 'starter', 'professional', 'enterprise');--> statement-breakpoint
ALTER TYPE "public"."tenant_status" ADD VALUE 'provisioning' BEFORE 'active';--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "status" SET DEFAULT 'provisioning';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "merchant_email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "database_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "api_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "plan" "tenant_plan" DEFAULT 'free' NOT NULL;