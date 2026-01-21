ALTER TABLE "tenants" RENAME COLUMN "domain" TO "subdomain";--> statement-breakpoint
ALTER TABLE "tenants" RENAME CONSTRAINT "tenants_domain_unique" TO "tenants_subdomain_unique";
