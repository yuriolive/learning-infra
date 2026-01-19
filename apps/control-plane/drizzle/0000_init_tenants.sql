CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "tenants_domain_unique" UNIQUE("domain")
);
