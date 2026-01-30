import { createApiClient } from "@neondatabase/api-client";
import { type createLogger } from "@vendin/utils/logger";
import { LRUCache } from "lru-cache";

import type { Api, Branch } from "@neondatabase/api-client";

interface NeonProviderConfig {
  apiKey: string;
  projectId: string;
  defaultDatabase?: string;
  logger: ReturnType<typeof createLogger>;
}

const projectDefaultBranchCache = new LRUCache<string, string>({
  max: 100,
  ttl: 1000 * 60 * 5,
});

export class NeonProvider {
  private client: Api<unknown>;
  private projectId: string;
  private defaultDatabase: string;
  private logger: ReturnType<typeof createLogger>;

  constructor(private config: NeonProviderConfig) {
    this.logger = config.logger;
    this.client = createApiClient({
      apiKey: config.apiKey,
    });
    this.projectId = config.projectId;
    this.defaultDatabase = config.defaultDatabase ?? "neondb";
  }

  /**
   * Creates a new database for a tenant within the shared default branch.
   * This ensures isolation at the database level while staying within branch limits.
   * @param tenantId - The unique identifier of the tenant
   * @returns The connection string for the new tenant database
   */
  async createTenantDatabase(tenantId: string): Promise<string> {
    try {
      this.logger.info({ tenantId }, "Creating Neon database for tenant");

      // Resolve the default branch dynamically
      const branchId = await this.getProjectDefaultBranch(this.projectId);
      const databaseName = `db_${tenantId.replaceAll("-", "_")}`;

      // 1. Get the endpoint for the branch to get the host
      const { data: endpointsData } =
        await this.client.listProjectBranchEndpoints(this.projectId, branchId);

      const endpoint = endpointsData.endpoints[0];
      if (!endpoint) {
        throw new Error(`No endpoint found for the branch: ${branchId}`);
      }

      // 2. We use a dedicated role for the tenant to maintain some isolation
      const roleName = this.getRoleNameForTenant(tenantId);

      try {
        // Try creating the role first
        const { data: roleData } = await this.client.createProjectBranchRole(
          this.projectId,
          branchId,
          {
            role: {
              name: roleName,
            },
          },
        );

        const password = roleData.role.password;
        if (!password) {
          throw new Error("Failed to obtain password for tenant role");
        }

        // 3. Create the database owned by this role
        await this.client.createProjectBranchDatabase(
          this.projectId,
          branchId,
          {
            database: {
              name: databaseName,
              owner_name: roleName,
            },
          },
        );

        const hostname = endpoint.host;
        const connectionString = `postgres://${roleName}:${password}@${hostname}/${databaseName}?sslmode=require`;

        this.logger.info(
          { databaseName, tenantId },
          "Successfully provisioned Neon database",
        );
        return connectionString;
      } catch (roleError: unknown) {
        // If role creation failed because it exists, we might need to reset password or handle it
        // For now, let's assume it doesn't exist since tenant IDs are unique
        this.logger.error(
          { error: roleError as Error, tenantId },
          "Failed to create role or database",
        );
        throw roleError;
      }
    } catch (error) {
      this.logger.error(
        { error, tenantId },
        "Failed to provision Neon database",
      );
      throw error;
    }
  }

  private async getProjectDefaultBranch(projectId: string): Promise<string> {
    const cached = projectDefaultBranchCache.get(projectId);
    if (cached) {
      return cached;
    }

    try {
      const { data } = await this.client.listProjectBranches({ projectId });
      const defaultBranch = data.branches.find((b: Branch) => b.default);

      const branchId = defaultBranch ? defaultBranch.id : "production";

      projectDefaultBranchCache.set(projectId, branchId);
      return branchId;
    } catch (error) {
      this.logger.error(
        { error, projectId },
        "Failed to list project branches",
      );
      throw error;
    }
  }

  /**
   * Generates a consistent role name for a tenant.
   * Centralizing this logic ensures consistency across different environments.
   * @param tenantId - The unique identifier of the tenant
   * @returns The generated role name
   */
  private getRoleNameForTenant(tenantId: string): string {
    return `user_${tenantId.replaceAll("-", "_")}`;
  }

  /**
   * Deletes the tenant's database and role.
   * Used for rollback in case of provisioning failures.
   * @param tenantId - The unique identifier of the tenant
   */
  async deleteTenantDatabase(tenantId: string): Promise<void> {
    try {
      this.logger.info({ tenantId }, "Deleting Neon database for tenant");

      const branchId = await this.getProjectDefaultBranch(this.projectId);
      const databaseName = `db_${tenantId.replaceAll("-", "_")}`;
      const roleName = this.getRoleNameForTenant(tenantId);

      // Best effort cleanup: try to delete database first, then role
      try {
        await this.client.deleteProjectBranchDatabase(
          this.projectId,
          branchId,
          databaseName,
        );
        this.logger.info({ databaseName }, "Deleted tenant database");
      } catch (error: unknown) {
        // Ignore if not found
        if (
          typeof error === "object" &&
          error !== null &&
          (error as { status?: number }).status !== 404
        ) {
          this.logger.warn(
            { error, databaseName },
            "Failed to delete database",
          );
        }
      }

      try {
        await this.client.deleteProjectBranchRole(
          this.projectId,
          branchId,
          roleName,
        );
        this.logger.info({ roleName }, "Deleted tenant role");
      } catch (error: unknown) {
        // Ignore if not found
        if (
          typeof error === "object" &&
          error !== null &&
          (error as { status?: number }).status !== 404
        ) {
          this.logger.warn({ error, roleName }, "Failed to delete role");
        }
      }
    } catch (error) {
      this.logger.error(
        { error, tenantId },
        "Failed to cleanup Neon resources during rollback",
      );
      // We don't throw here to allow other cleanup tasks to proceed
    }
  }
}
