import { type createLogger } from "@vendin/utils/logger";
import { z } from "zod";

import { type Database } from "../../database/database";
import { tenantProvisioningEvents } from "../../database/schema";
import { type TenantService } from "../tenants/tenant.service";

const requestSchema = z.object({
  tenantId: z.string().uuid(),
});

export class ProvisioningController {
  constructor(
    private service: TenantService,
    private database: Database,
    private logger: ReturnType<typeof createLogger>,
    private internalApiKey: string,
  ) {}

  async handleRequest(request: Request): Promise<Response> {
    const authResponse = this.checkAuth(request);
    if (authResponse) return authResponse;

    const url = new URL(request.url);
    const action = url.pathname.split("/").pop();

    try {
      if (request.method === "GET" && action === "status") {
        return await this.handleMigrationStatus(url);
      }

      const body = await request.json();
      const { tenantId } = requestSchema.parse(body);

      return await this.dispatchAction(action, tenantId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(JSON.stringify({ error: error.errors }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      this.logger.error({ error }, "Error in provisioning controller");
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  private checkAuth(request: Request): Response | null {
    const key = request.headers.get("X-Internal-Key");
    if (!key || key !== this.internalApiKey) {
      this.logger.warn(
        "Unauthorized attempt to access provisioning controller",
      );
      return new Response("Unauthorized", { status: 401 });
    }
    return null;
  }

  private async dispatchAction(
    action: string | undefined,
    tenantId: string,
  ): Promise<Response> {
    switch (action) {
      case "database": {
        return await this.handleStep(tenantId, "create_db", () =>
          this.service.provisionDatabase(tenantId),
        );
      }
      case "migrations": {
        // Change: Returns execution name immediately (async trigger)
        return await this.handleStep(tenantId, "migrate_db", () =>
          this.service.triggerMigration(tenantId),
        );
      }
      case "service": {
        return await this.handleStep(tenantId, "deploy_service", () =>
          this.service.deployService(tenantId),
        );
      }
      case "domain": {
        return await this.handleStep(tenantId, "setup_domain", () =>
          this.service.configureDomain(tenantId),
        );
      }
      case "activate": {
        return await this.handleStep(tenantId, "activate_tenant", () =>
          this.service.activateTenant(tenantId),
        );
      }
      case "rollback": {
        return await this.handleStep(tenantId, "rollback", () =>
          this.service.rollbackResources(tenantId),
        );
      }
      default: {
        return new Response("Not Found", { status: 404 });
      }
    }
  }

  private async handleMigrationStatus(url: URL): Promise<Response> {
    const executionName = url.searchParams.get("name");
    if (!executionName) {
      return new Response(JSON.stringify({ error: "Missing name parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const status = await this.service.getMigrationStatus(executionName);
    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleStep<T>(
    tenantId: string,
    step: string,
    action: () => Promise<T>,
  ): Promise<Response> {
    await this.logEvent(tenantId, step, "started");
    try {
      const result = await action();
      await this.logEvent(tenantId, step, "completed");

      const responseBody = result === undefined ? { status: "ok" } : result;

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.logEvent(tenantId, step, "failed", { error: errorMessage });
      throw error; // Re-throw so the caller (Workflow) knows it failed
    }
  }

  private async logEvent(
    tenantId: string,
    step: string,
    status: string,
    details?: Record<string, unknown>,
  ) {
    try {
      await this.database.insert(tenantProvisioningEvents).values({
        tenantId,
        step,
        status,
        details,
      });
    } catch (error) {
      // Don't fail the request if logging fails, but log it
      this.logger.error(
        { error, tenantId, step, status },
        "Failed to write provisioning event",
      );
    }
  }
}
