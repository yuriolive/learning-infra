import { eq, and, sql, inArray } from "drizzle-orm";
import { type Database } from "../../database/database";
import {
  upgradeCampaigns,
  tenantUpgradeExecutions,
  tenants,
  releaseChannels
} from "../../database/schema";
import { type Logger } from "../../utils/logger";

export class UpgradeService {
  constructor(
    private db: Database,
    private logger: Logger
  ) {}

  async createCampaign(targetImageTag: string, channelId: string): Promise<string> {
    this.logger.info({ targetImageTag, channelId }, "Creating upgrade campaign");

    return await this.db.transaction(async (tx) => {
      // 1. Create Campaign
      const [campaign] = await tx
        .insert(upgradeCampaigns)
        .values({
          targetImageTag,
          channelId,
          status: "pending",
        })
        .returning();

      if (!campaign) throw new Error("Failed to create campaign");

      // 2. Find eligible tenants
      const eligibleTenants = await tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(
          and(
            eq(tenants.releaseChannelId, channelId),
            eq(tenants.status, "active") // Only active tenants
          )
        );

      if (eligibleTenants.length === 0) {
        this.logger.warn({ channelId }, "No eligible tenants found for campaign");
        return campaign.id;
      }

      // 3. Queue executions
      const executions = eligibleTenants.map((t) => ({
        campaignId: campaign.id,
        tenantId: t.id,
        status: "queued" as const,
      }));

      await tx.insert(tenantUpgradeExecutions).values(executions);

      this.logger.info(
        { campaignId: campaign.id, count: executions.length },
        "Queued tenants for upgrade"
      );

      return campaign.id;
    });
  }

  async getNextBatch(campaignId: string, batchSize = 10): Promise<any[]> {
    // Check if campaign is paused or failed
    const [campaign] = await this.db
      .select()
      .from(upgradeCampaigns)
      .where(eq(upgradeCampaigns.id, campaignId));

    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status === "paused" || campaign.status === "failed" || campaign.status === "completed") {
      return [];
    }

    // Update campaign to running if pending
    if (campaign.status === "pending") {
      await this.db
        .update(upgradeCampaigns)
        .set({ status: "running" })
        .where(eq(upgradeCampaigns.id, campaignId));
    }

    // Check concurrency
    const runningStates = ["snapshotting", "migrating", "deploying", "verifying"];
    const results = await this.db
       .select({ count: sql<number>`count(*)` })
       .from(tenantUpgradeExecutions)
       .where(and(
           eq(tenantUpgradeExecutions.campaignId, campaignId),
           inArray(tenantUpgradeExecutions.status, runningStates as any)
       ));

    // Use campaign batch size as concurrency limit if needed, or default 10
    const runningCount = results[0] ?? { count: 0 };
    const concurrencyLimit = campaign.batchSize || 10;
    const availableSlots = concurrencyLimit - Number(runningCount.count);

    if (availableSlots <= 0) {
        return [];
    }

    const fetchSize = Math.min(batchSize, availableSlots);

    // Fetch queued executions
    const batch = await this.db
      .select({
        executionId: tenantUpgradeExecutions.id,
        tenantId: tenantUpgradeExecutions.tenantId,
        targetImageTag: upgradeCampaigns.targetImageTag,
        currentImageTag: tenants.currentImageTag,
      })
      .from(tenantUpgradeExecutions)
      .innerJoin(upgradeCampaigns, eq(tenantUpgradeExecutions.campaignId, upgradeCampaigns.id))
      .innerJoin(tenants, eq(tenantUpgradeExecutions.tenantId, tenants.id))
      .where(
        and(
          eq(tenantUpgradeExecutions.campaignId, campaignId),
          eq(tenantUpgradeExecutions.status, "queued")
        )
      )
      .limit(fetchSize);

    if (batch.length > 0) {
        const ids = batch.map(b => b.executionId);
        await this.db
            .update(tenantUpgradeExecutions)
            .set({ status: "snapshotting" }) // Mark as started/snapshotting to prevent re-fetch
            .where(inArray(tenantUpgradeExecutions.id, ids));
    }

    return batch;
  }

  async updateExecutionStatus(
    executionId: string,
    status: string,
    logs?: any
  ): Promise<void> {
    this.logger.info({ executionId, status }, "Updating execution status");

    await this.db
      .update(tenantUpgradeExecutions)
      .set({
        status: status as any,
        logs: logs ? JSON.stringify(logs) : undefined,
        ...(status === 'completed' || status === 'failed' || status === 'rolled_back'
            ? { finishedAt: new Date() }
            : {}),
        ...(status === 'snapshotting' ? { startedAt: new Date() } : {})
      })
      .where(eq(tenantUpgradeExecutions.id, executionId));

    // If completed, update tenant's current image tag
    if (status === 'completed') {
       const [execution] = await this.db
         .select({
            tenantId: tenantUpgradeExecutions.tenantId,
            targetImageTag: upgradeCampaigns.targetImageTag
         })
         .from(tenantUpgradeExecutions)
         .innerJoin(upgradeCampaigns, eq(tenantUpgradeExecutions.campaignId, upgradeCampaigns.id))
         .where(eq(tenantUpgradeExecutions.id, executionId));

       if (execution) {
         await this.db
           .update(tenants)
           .set({ currentImageTag: execution.targetImageTag })
           .where(eq(tenants.id, execution.tenantId));
       }
    }

    // Check campaign failure threshold
    if (status === 'failed') {
      await this.checkCampaignHealth(executionId);
    }
  }

  private async checkCampaignHealth(executionId: string) {
     const [execution] = await this.db
       .select({ campaignId: tenantUpgradeExecutions.campaignId })
       .from(tenantUpgradeExecutions)
       .where(eq(tenantUpgradeExecutions.id, executionId));

     if (!execution) return;

     const campaignId = execution.campaignId;

     const stats = await this.db
       .select({
         count: sql<number>`count(*)`,
         status: tenantUpgradeExecutions.status
       })
       .from(tenantUpgradeExecutions)
       .where(eq(tenantUpgradeExecutions.campaignId, campaignId))
       .groupBy(tenantUpgradeExecutions.status);

     let total = 0;
     let failed = 0;

     for (const stat of stats) {
       total += Number(stat.count);
       if (stat.status === 'failed') {
         failed += Number(stat.count);
       }
     }

     if (total === 0) return;

     const failureRate = (failed / total) * 100;

     const [campaign] = await this.db
        .select()
        .from(upgradeCampaigns)
        .where(eq(upgradeCampaigns.id, campaignId));

     if (campaign && failureRate > campaign.failureThresholdPercent) {
       this.logger.warn(
         { campaignId, failureRate, threshold: campaign.failureThresholdPercent },
         "Campaign failure threshold exceeded. Pausing campaign."
       );
       await this.db
         .update(upgradeCampaigns)
         .set({ status: "failed" })
         .where(eq(upgradeCampaigns.id, campaignId));
     }
  }
}
