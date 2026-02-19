CREATE TABLE "tenant_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"phone" text NOT NULL,
	"role" text DEFAULT 'owner',
	"phone_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_admins_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_phone_number" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_phone_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_provider" text DEFAULT 'facebook';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenant_admins" ADD CONSTRAINT "tenant_admins_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_whatsapp_phone_number_unique" UNIQUE("whatsapp_phone_number");