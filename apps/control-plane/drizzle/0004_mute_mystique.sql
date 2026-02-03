ALTER TABLE "tenants" ADD COLUMN "jwt_secret" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "cookie_secret" text;