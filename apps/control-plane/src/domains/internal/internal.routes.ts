import { type Database } from "../../database/database";
import { type Logger } from "../../utils/logger";
import { type ProvisioningService } from "../provisioning/provisioning.service";
import { type TenantService } from "../tenants/tenant.service";

import { ProvisioningController } from "./provisioning.controller";
import { CampaignController } from "./campaign.controller";
import { UpgradeService } from "../provisioning/upgrade.service";

export interface InternalRouteContext {
  logger: Logger;
  tenantService: TenantService;
  provisioningService: ProvisioningService;
  db: Database;
}

export function createInternalRoutes(context: InternalRouteContext) {
  const provisioningController = new ProvisioningController(
    context.tenantService,
    context.provisioningService,
    context.db,
    context.logger,
  );

  const upgradeService = new UpgradeService(context.db, context.logger);
  const campaignController = new CampaignController(upgradeService, context.logger);

  return {
    handleRequest(request: Request): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/internal/provisioning/")) {
        return provisioningController.handleRequest(request);
      }
      if (url.pathname.startsWith("/internal/campaigns")) {
        return campaignController.handleRequest(request);
      }
      return Promise.resolve(new Response("Not found", { status: 404 }));
    },
  };
}
