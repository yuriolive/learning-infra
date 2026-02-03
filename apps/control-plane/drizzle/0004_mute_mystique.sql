ALTER TABLE "tenants" ADD COLUMN "jwt_secret" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "cookie_secret" text NOT NULL;