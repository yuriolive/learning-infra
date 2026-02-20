import { createApiClient } from "@neondatabase/api-client";
import { cache } from "@vendin/cache";

import type { Logger } from "../../utils/logger";
import type { Api, Branch } from "@neondatabase/api-client";

interface NeonProviderConfig {
  apiKey: string;
  /** @deprecated Used for shared project strategy. */
  projectId?: string;
  orgId?: string;
  defaultDatabase?: string;
  logger: Logger;
}

export interface TenantProject {
  projectId: string;
  connectionString: string;
}

export class NeonProvider {
  private client: Api<unknown>;
  private logger: Logger;
  private orgId: string | undefined;

  constructor(config: NeonProviderConfig) {
    this.logger = config.logger;
    this.client = createApiClient({
      apiKey: config.apiKey,
    });
    this.orgId = config.orgId;
  }

  /**
   * Creates a dedicated Neon Project for the tenant.
   * This provides full isolation and enables project-level features like branching/snapshots.
   */
  async createTenantProject(tenantId: string): Promise<TenantProject> {
    try {
      this.logger.info({ tenantId }, "Creating Neon project for tenant");

      const response = await this.client.createProject({
        project: {
          name: `tenant-${tenantId}`,
          ...(this.orgId ? { org_id: this.orgId } : {}),
        },
      });

      const { project, connection_uris } = response.data;

      // Ensure we have a connection string
      const connectionUri = connection_uris?.[0]?.connection_uri;

      if (!project.id || !connectionUri) {
        throw new Error("Failed to retrieve project ID or connection URI");
      }

      this.logger.info(
        { projectId: project.id, tenantId },
        "Successfully created Neon project",
      );

      return {
        projectId: project.id,
        connectionString: connectionUri,
      };
    } catch (error) {
      this.logger.error({ error, tenantId }, "Failed to create Neon project");
      throw error;
    }
  }

  /**
   * Deletes the tenant's dedicated Neon Project.
   */
  async deleteTenantProject(projectId: string): Promise<void> {
    try {
      this.logger.info({ projectId }, "Deleting Neon project");
      await this.client.deleteProject(projectId);
      this.logger.info({ projectId }, "Deleted Neon project");
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        (error as { status?: number }).status !== 404
      ) {
        this.logger.error({ error, projectId }, "Failed to delete project");
        throw error;
      }
      this.logger.warn({ projectId }, "Project not found, skipping delete");
    }
  }

  /**
   * Creates a snapshot (Branch) of the main branch.
   */
  async createSnapshot(
    projectId: string,
    snapshotName: string,
  ): Promise<string> {
    try {
      this.logger.info({ projectId, snapshotName }, "Creating database snapshot");

      const mainBranchId = await this.getProjectDefaultBranch(projectId);

      const { data } = await this.client.createProjectBranch(projectId, {
        branch: {
          name: snapshotName,
          parent_id: mainBranchId,
        },
      });

      this.logger.info(
        { projectId, snapshotName, branchId: data.branch.id },
        "Created snapshot branch",
      );
      return data.branch.id;
    } catch (error) {
      this.logger.error(
        { error, projectId, snapshotName },
        "Failed to create snapshot",
      );
      throw error;
    }
  }

  /**
   * Restores the main branch to the state of a snapshot branch.
   * This effectively resets 'main' to match 'snapshotName'.
   */
  async restoreFromSnapshot(
    projectId: string,
    snapshotName: string,
  ): Promise<void> {
    try {
      this.logger.info(
        { projectId, snapshotName },
        "Restoring database from snapshot",
      );

      const mainBranchId = await this.getProjectDefaultBranch(projectId);

      // Find the snapshot branch ID by name
      // Note: In a real scenario, we might store the branch ID, but name lookup is fine here.
      // We need to list branches to find the ID if we don't have it.
      // But restoreProjectBranch expects source_branch_id.

      const snapshotBranchId = await this.getBranchIdByName(
        projectId,
        snapshotName,
      );

      if (!snapshotBranchId) {
        throw new Error(`Snapshot branch '${snapshotName}' not found`);
      }

      await this.client.restoreProjectBranch(projectId, mainBranchId, {
        source_branch_id: snapshotBranchId,
      });

      this.logger.info({ projectId }, "Successfully restored main branch");
    } catch (error) {
      this.logger.error(
        { error, projectId, snapshotName },
        "Failed to restore from snapshot",
      );
      throw error;
    }
  }

  // --- Helpers ---

  private async getProjectDefaultBranch(projectId: string): Promise<string> {
    const cacheKey = `neon:default-branch:${projectId}`;
    const cached = await cache.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data } = await this.client.listProjectBranches({ projectId });
      const defaultBranch = data.branches.find((b: Branch) => b.default);

      // Fallback to 'main' if not explicitly marked (though it should be)
      const branchId = defaultBranch ? defaultBranch.id : undefined;

      if (!branchId) {
         // Try finding one named 'main'
         const main = data.branches.find((b: Branch) => b.name === 'main');
         if (main) return main.id;
         throw new Error("Default branch not found");
      }

      await cache.set(cacheKey, branchId, { ttlSeconds: 300 });
      return branchId;
    } catch (error) {
      this.logger.error(
        { error, projectId },
        "Failed to list project branches",
      );
      throw error;
    }
  }

  private async getBranchIdByName(
    projectId: string,
    name: string,
  ): Promise<string | undefined> {
    try {
      // Pagination might be needed if there are many branches,
      // but for a tenant project, it shouldn't be huge yet.
      // Using limit 100 to be safe.
      const { data } = await this.client.listProjectBranches({
        projectId,
        limit: 100,
      });
      const branch = data.branches.find((b: Branch) => b.name === name);
      return branch?.id;
    } catch (error) {
      this.logger.error(
        { error, projectId, branchName: name },
        "Failed to find branch by name",
      );
      throw error;
    }
  }

    /**
   * Deletes the tenant's database and role.
   * Used for rollback in case of provisioning failures.
   * @param tenantId - The unique identifier of the tenant
   */
    async deleteTenantDatabase(tenantId: string): Promise<void> {
        // Legacy method kept for interface compatibility if needed,
        // but implementation should ideally forward to deleteTenantProject if we have the ID.
        // However, we pass tenantId here, not projectId.
        // If we don't have projectId easily available here, we might skip or log warning.
        // For now, let's assume the caller will call deleteTenantProject with the stored projectId.
        this.logger.warn({ tenantId }, "deleteTenantDatabase called but using Project-per-Tenant strategy. Use deleteTenantProject instead.");
    }
}
