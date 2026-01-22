import { createApiClient } from "@neondatabase/api-client";
import { createLogger } from "@vendin/utils/logger";

import type { Api } from "@neondatabase/api-client";

const logger = createLogger({
  logLevel: process.env.LOG_LEVEL,
  nodeEnv: process.env.NODE_ENV ?? "development",
});

export class NeonProvider {
  private client: Api<unknown>;
  private projectId: string;
  private defaultDatabase: string;

  constructor() {
    const apiKey = process.env.NEON_API_KEY;
    const projectId = process.env.NEON_PROJECT_ID;

    if (!apiKey) {
      throw new Error("NEON_API_KEY environment variable is not set");
    }

    if (!projectId) {
      throw new Error("NEON_PROJECT_ID environment variable is not set");
    }

    this.client = createApiClient({
      apiKey,
    });
    this.projectId = projectId;
    this.defaultDatabase = this.inferDefaultDatabase();
  }

  /**
   * Creates a new database branch for a tenant.
   * This ensures isolation and independent scaling (serverless compute).
   * @param tenantId - The unique identifier of the tenant
   * @returns The connection string for the new tenant database
   */
  async createTenantDatabase(tenantId: string): Promise<string> {
    try {
      logger.info({ tenantId }, "Creating Neon database branch for tenant");

      // Create a branch for the tenant
      // We use the tenant ID as part of the branch name
      const branchName = `tenant-${tenantId}`;

      const { data: branchData } = await this.client.createProjectBranch(
        this.projectId,
        {
          branch: {
            name: branchName,
          },
        },
      );

      const branchId = branchData.branch.id;
      logger.info({ branchId, tenantId }, "Created Neon branch");

      // We need to wait for the branch to be ready or just get the connection string.
      // Usually, creating a branch also creates a default role and database.
      // We can get the connection URI with the password.

      // Get the role password or connection string.
      // The API to get connection string usually involves getting endpoints.

      const { data: endpointsData } =
        await this.client.listProjectBranchEndpoints(this.projectId, branchId);

      const endpoint = endpointsData.endpoints[0];
      if (!endpoint) {
        throw new Error("No endpoint found for the created branch");
      }

      // We need to get the role (user) to construct the connection string.
      // Usually the default role is 'neondb_owner' or similar, but with branches it might be different.
      // Let's list roles for the branch.

      const { data: rolesData } = await this.client.listProjectBranchRoles(
        this.projectId,
        branchId,
      );

      const role =
        rolesData.roles.find((r) => r.name !== "postgres") ||
        rolesData.roles[0];

      if (!role) {
        throw new Error("No role found for the created branch");
      }

      // We need the password.
      // The `createProjectBranchRole` response contains the password.
      const roleName = this.getRoleNameForTenant(tenantId);

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
        // If creation didn't return a password, try to reset it to get a new one
        const { data: resetData } =
          await this.client.resetProjectBranchRolePassword(
            this.projectId,
            branchId,
            roleName,
          );
        if (!resetData.role.password) {
          throw new Error("Failed to obtain password for tenant role");
        }
        // Use the password from reset

        const resetPassword = resetData.role.password!;
        const databaseName = this.defaultDatabase;
        const hostname = endpoint.host;
        const connectionString = `postgres://${roleName}:${resetPassword}@${hostname}/${databaseName}?sslmode=require`;

        logger.info(
          { branchId, tenantId },
          "Successfully provisioned Neon database",
        );
        return connectionString;
      }

      const databaseName = this.defaultDatabase;

      // Construct connection string
      // postgres://user:password@hostname/dbname?sslmode=require
      const hostname = endpoint.host;
      const connectionString = `postgres://${roleName}:${password}@${hostname}/${databaseName}?sslmode=require`;

      logger.info(
        { branchId, tenantId },
        "Successfully provisioned Neon database",
      );

      return connectionString;
    } catch (error) {
      logger.error({ error, tenantId }, "Failed to provision Neon database");
      throw error;
    }
  }

  /**
   * Infers the default database name from environment variables.
   * Priority: NEON_DEFAULT_DB \> DATABASE_URL \> "neondb"
   */
  private inferDefaultDatabase(): string {
    if (process.env.NEON_DEFAULT_DB) {
      return process.env.NEON_DEFAULT_DB;
    }

    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        const databaseName = url.pathname.slice(1);
        if (databaseName) {
          return databaseName;
        }
      } catch {
        // Ignore invalid URL
        logger.warn(
          { tenantId: "default" },
          "Failed to infer default database name from DATABASE_URL",
        );
      }
    }

    return "neondb";
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
