import { type createLogger } from "@vendin/utils/logger";

import { type Database } from "../../database/database";
import { type TenantService } from "../tenants/tenant.service";

import { ProvisioningController } from "./provisioning.controller";

export interface InternalRouteContext {
  logger: ReturnType<typeof createLogger>;
  tenantService: TenantService;
  db: Database;
  internalApiSecret: string;
}

export function createInternalRoutes(context: InternalRouteContext) {
  const controller = new ProvisioningController(
    context.tenantService,
    context.db,
    context.logger,
    context.internalApiSecret,
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
