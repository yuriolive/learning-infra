import { z } from "zod";

import { type Database } from "../../database/database";
import { type Logger } from "../../utils/logger";
import { type ProvisioningService } from "../provisioning/provisioning.service";
import { type TenantService } from "../tenants/tenant.service";

const requestSchema = z.object({
  tenantId: z.string().uuid(),
  snapshotName: z.string().optional(),
  imageTag: z.string().optional(), // For migration/deploy overrides
});

export class ProvisioningController {
  constructor(
    private tenantService: TenantService,
    private provisioningService: ProvisioningService,
    private database: Database,
    private logger: Logger,
  ) {}

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.pathname.split("/").pop();

    try {
      if (request.method === "GET" && action === "status") {
        return await this.handleMigrationStatus(url);
      }
      if (request.method === "GET" && action === "operations") {
        return await this.handleOperationStatus(url);
      }

      const body = await request.json();
      const { tenantId, snapshotName, imageTag } = requestSchema.parse(body);

      return await this.dispatchAction(
        action,
        tenantId,
        request,
        body,
        snapshotName,
        imageTag,
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(JSON.stringify({ error: error.errors }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      this.logger.error({ error }, "Error in provisioning controller");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  private dispatchAction(
    action: string | undefined,
    tenantId: string,
    request: Request,
    body: unknown,
    snapshotName?: string,
    imageTag?: string,
  ): Promise<Response> {
    switch (action) {
      case "database": {
        return this.handleStep(tenantId, "create_db", () =>
          this.provisioningService.provisionDatabase(tenantId),
        );
      }
      case "snapshot": {
        // Default snapshot name if not provided
        const name = snapshotName || `backup-${Date.now()}`;
        return this.handleStep(tenantId, "create_db_snapshot", () =>
          this.provisioningService.createDatabaseSnapshot(tenantId, name),
        );
      }
      case "restore": {
        if (!snapshotName)
          throw new Error("Snapshot name required for restore");
        return this.handleStep(tenantId, "restore_db_snapshot", () =>
          this.provisioningService.restoreDatabaseSnapshot(
            tenantId,
            snapshotName,
          ),
        );
      }
      case "migrations": {
        const url = new URL(request.url || "", "http://localhost");
        const subAction = url.searchParams.get("action");

        if (subAction === "ensure") {
          return this.handleStep(tenantId, "ensure_migration_job", () =>
            this.provisioningService.ensureMigrationJob(tenantId, imageTag),
          );
        }

        if (subAction === "delete") {
          return this.handleStep(tenantId, "delete_migration_job", () =>
            this.provisioningService.deleteMigrationJob(tenantId),
          );
        }

        // Default to trigger, or explicit trigger
        return this.handleStep(tenantId, "trigger_migration_job", () =>
          this.provisioningService.triggerMigrationJob(tenantId),
        );
      }
      case "service": {
        return this.handleStep(tenantId, "deploy_service_start", () =>
          this.provisioningService.startDeployService(tenantId, imageTag),
        );
      }
      case "finalize": {
        // Path: /service/finalize -> action: finalize
        return this.handleStep(tenantId, "deploy_service_finalize", () =>
          this.provisioningService.finalizeDeployment(tenantId),
        );
      }
      case "domain": {
        return this.handleStep(tenantId, "setup_domain", () =>
          this.provisioningService.configureDomain(tenantId),
        );
      }
      case "activate": {
        return this.handleStep(tenantId, "activate_tenant", () =>
          this.provisioningService.activateTenant(tenantId),
        );
      }
      case "rollback": {
        const rollbackSchema = z.object({
          reason: z.string().optional(),
        });
        const { reason } = rollbackSchema.parse(body);
        return this.handleStep(tenantId, "rollback", () =>
          this.provisioningService.rollbackResources(tenantId, reason),
        );
      }
      default: {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }),
        );
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

    this.logger.info({ executionName }, "Checking migration status");
    const status =
      await this.provisioningService.getMigrationStatus(executionName);
    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleOperationStatus(url: URL): Promise<Response> {
    const operationName = url.searchParams.get("name");
    if (!operationName) {
      return new Response(JSON.stringify({ error: "Missing name parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    this.logger.info({ operationName }, "Checking operation status");
    const status =
      await this.provisioningService.getOperationStatus(operationName);
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

      const responseBody = result ?? { status: "ok" };

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
      await this.tenantService.logProvisioningEvent(
        tenantId,
        step,
        status,
        details,
      );
    } catch (error) {
      // Don't fail the request if logging fails, but log it
      this.logger.error(
        { error, tenantId, step, status },
        "Failed to write provisioning event",
      );
    }
  }
}
