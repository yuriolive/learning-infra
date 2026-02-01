import { type Database } from "../../database/database";
import { type Logger } from "../../utils/logger";
import { type TenantService } from "../tenants/tenant.service";

import { ProvisioningController } from "./provisioning.controller";

export interface InternalRouteContext {
  logger: Logger;
  tenantService: TenantService;
  db: Database;
  internalApiKey: string;
}

export function createInternalRoutes(context: InternalRouteContext) {
  const controller = new ProvisioningController(
    context.tenantService,
    context.db,
    context.logger,
    context.internalApiKey,
  );

  return {
    handleRequest(request: Request): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/internal/provisioning/")) {
        return controller.handleRequest(request);
      }
      return Promise.resolve(new Response("Not found", { status: 404 }));
    },
  };
}
