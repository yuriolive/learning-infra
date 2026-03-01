CREATE INDEX "tenant_admins_tenant_id_idx" ON "tenant_admins" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_provisioning_events_tenant_id_idx" ON "tenant_provisioning_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_upgrade_executions_campaign_id_idx" ON "tenant_upgrade_executions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "tenant_upgrade_executions_tenant_id_idx" ON "tenant_upgrade_executions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenants_release_channel_id_idx" ON "tenants" USING btree ("release_channel_id");--> statement-breakpoint
CREATE INDEX "upgrade_campaigns_channel_id_idx" ON "upgrade_campaigns" USING btree ("channel_id");