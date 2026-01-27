import { createApiClient } from "@neondatabase/api-client";
import { type createLogger } from "@vendin/utils/logger";

import type { Api } from "@neondatabase/api-client";

interface NeonProviderConfig {
  apiKey: string;
  projectId: string;
  defaultDatabase?: string;
  logger: ReturnType<typeof createLogger>;
}

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
   * Creates a new database for a tenant within the shared main branch.
   * This ensures isolation at the database level while staying within branch limits.
   * @param tenantId - The unique identifier of the tenant
   * @returns The connection string for the new tenant database
   */
  async createTenantDatabase(tenantId: string): Promise<string> {
    try {
      this.logger.info({ tenantId }, "Creating Neon database for tenant");

      // We use a shared branch (main) for all tenant databases
      // In a more advanced setup, this could be configurable
      const branchId = "main";
      const databaseName = `db_${tenantId.replaceAll("-", "_")}`;

      // 1. Get the endpoint for the main branch to get the host
      const { data: endpointsData } =
        await this.client.listProjectBranchEndpoints(this.projectId, branchId);

      const endpoint = endpointsData.endpoints[0];
      if (!endpoint) {
        throw new Error("No endpoint found for the main branch");
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

  /**
   * Generates a consistent role name for a tenant.
   * Centralizing this logic ensures consistency across different environments.
   * @param tenantId - The unique identifier of the tenant
   * @returns The generated role name
   */
  private getRoleNameForTenant(tenantId: string): string {
    return `user_${tenantId.replaceAll("-", "_")}`;
  }
}
