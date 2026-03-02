import { eq, and, sql, inArray } from "drizzle-orm";

import { type Database } from "../../database/database";
import {
  releaseChannels,
  upgradeCampaigns,
  tenantUpgradeExecutions,
  tenants,
  upgradeCampaignStatusEnum,
  upgradeExecutionStatusEnum,
} from "../../database/schema";
import { type Logger } from "../../utils/logger";

// ---------------------------------------------------------------------------
// Module-level constants derived from schema enums.
// Defined once to avoid recreating Sets/arrays on every method invocation.
// ---------------------------------------------------------------------------

const TERMINAL_CAMPAIGN_STATES = new Set<string>(["completed", "failed"]);

const TERMINAL_EXECUTION_STATES = new Set<string>([
  "completed",
  "failed",
  "rolled_back",
]);

/** Execution states that mean "still in flight" — complement of terminal. */
const PENDING_EXECUTION_STATES = upgradeExecutionStatusEnum.enumValues.filter(
  (s) => !TERMINAL_EXECUTION_STATES.has(s),
);

/** Campaign states that can still transition (not yet terminal). */
const NON_TERMINAL_CAMPAIGN_STATES =
  upgradeCampaignStatusEnum.enumValues.filter(
    (s) => !TERMINAL_CAMPAIGN_STATES.has(s),
  );

export class UpgradeService {
  constructor(
    private database: Database,
    private logger: Logger,
  ) {}

  createCampaign(targetImageTag: string, channelId: string): Promise<string> {
    this.logger.info(
      { targetImageTag, channelId },
      "Creating upgrade campaign",
    );

    return this.database.transaction(async (tx) => {
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
            eq(tenants.status, "active"), // Only active tenants
          ),
        );

      if (eligibleTenants.length === 0) {
        this.logger.warn(
          { channelId },
          "No eligible tenants found for campaign",
        );
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
        "Queued tenants for upgrade",
      );

      return campaign.id;
    });
  }

  async getNextBatch(
    campaignId: string,
  ): Promise<{ batch: unknown[]; campaignStatus: string }> {
    // Check if campaign is paused or failed
    const [campaign] = await this.database
      .select()
      .from(upgradeCampaigns)
      .where(eq(upgradeCampaigns.id, campaignId));

    if (!campaign) throw new Error("Campaign not found");
    if (
      campaign.status === "paused" ||
      campaign.status === "failed" ||
      campaign.status === "completed"
    ) {
      return { batch: [], campaignStatus: campaign.status };
    }

    // Update campaign to running if pending
    if (campaign.status === "pending") {
      await this.database
        .update(upgradeCampaigns)
        .set({ status: "running" })
        .where(eq(upgradeCampaigns.id, campaignId));
    }

    const runningStates: Array<
      "snapshotting" | "migrating" | "deploying" | "verifying"
    > = ["snapshotting", "migrating", "deploying", "verifying"];
    const results = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(tenantUpgradeExecutions)
      .where(
        and(
          eq(tenantUpgradeExecutions.campaignId, campaignId),
          inArray(tenantUpgradeExecutions.status, runningStates),
        ),
      );

    // Use campaign batch size as concurrency limit if needed, or default 10
    const runningCount = results[0] ?? { count: 0 };
    const concurrencyLimit = campaign.batchSize || 10;
    const availableSlots = concurrencyLimit - Number(runningCount.count);

    if (availableSlots <= 0) {
      return { batch: [], campaignStatus: campaign.status };
    }

    // Fetch queued executions
    const batch = await this.database.transaction(async (tx) => {
      const selected = await tx
        .select({
          executionId: tenantUpgradeExecutions.id,
          tenantId: tenantUpgradeExecutions.tenantId,
          targetImageTag: upgradeCampaigns.targetImageTag,
          currentImageTag: tenants.currentImageTag,
        })
        .from(tenantUpgradeExecutions)
        .innerJoin(
          upgradeCampaigns,
          eq(tenantUpgradeExecutions.campaignId, upgradeCampaigns.id),
        )
        .innerJoin(tenants, eq(tenantUpgradeExecutions.tenantId, tenants.id))
        .where(
          and(
            eq(tenantUpgradeExecutions.campaignId, campaignId),
            eq(tenantUpgradeExecutions.status, "queued"),
          ),
        )
        .limit(availableSlots)
        .for("update", { skipLocked: true });

      if (selected.length > 0) {
        const ids = selected.map((b) => b.executionId);
        await tx
          .update(tenantUpgradeExecutions)
          .set({ status: "snapshotting" }) // Mark as started/snapshotting to prevent re-fetch
          .where(inArray(tenantUpgradeExecutions.id, ids));
      }

      return selected;
    });

    return { batch, campaignStatus: "running" };
  }

  async updateExecutionStatus(
    executionId: string,
    status:
      | "completed"
      | "failed"
      | "snapshotting"
      | "migrating"
      | "deploying"
      | "verifying"
      | "queued"
      | "rolled_back",
    logs?: unknown,
  ): Promise<void> {
    this.logger.info({ executionId, status }, "Updating execution status");

    await this.database.transaction(async (tx) => {
      await tx
        .update(tenantUpgradeExecutions)
        .set({
          status,
          logs: logs || undefined,
          ...(status === "completed" ||
          status === "failed" ||
          status === "rolled_back"
            ? { finishedAt: new Date() }
            : {}),
          ...(status === "snapshotting" ? { startedAt: new Date() } : {}),
        })
        .where(eq(tenantUpgradeExecutions.id, executionId));

      // If completed, update tenant's current image tag
      if (status === "completed") {
        const [execution] = await tx
          .select({
            tenantId: tenantUpgradeExecutions.tenantId,
            targetImageTag: upgradeCampaigns.targetImageTag,
          })
          .from(tenantUpgradeExecutions)
          .innerJoin(
            upgradeCampaigns,
            eq(tenantUpgradeExecutions.campaignId, upgradeCampaigns.id),
          )
          .where(eq(tenantUpgradeExecutions.id, executionId));

        if (execution) {
          await tx
            .update(tenants)
            .set({ currentImageTag: execution.targetImageTag })
            .where(eq(tenants.id, execution.tenantId));
        }
      }
    });

    // Check campaign failure threshold before completion so that a campaign
    // already marked "failed" by health-check causes the completion check to
    // bail early, preventing a "completed" → "failed" transition race.
    if (status === "failed") {
      await this.checkCampaignHealth(executionId);
    }

    if (
      status === "completed" ||
      status === "failed" ||
      status === "rolled_back"
    ) {
      await this.checkCampaignCompletion(executionId);
    }
  }

  private async checkCampaignCompletion(executionId: string): Promise<void> {
    // Returns promotion details if a campaign completes with auto-promote
    // enabled; null otherwise. createCampaign is called outside the transaction
    // to avoid nested transactions (which Drizzle does not support).
    const promotionDetails = await this.database.transaction(async (tx) => {
      const [execution] = await tx
        .select({
          campaignId: tenantUpgradeExecutions.campaignId,
          targetImageTag: upgradeCampaigns.targetImageTag,
          channelId: upgradeCampaigns.channelId,
          campaignStatus: upgradeCampaigns.status,
          failureThresholdPercent: upgradeCampaigns.failureThresholdPercent,
        })
        .from(tenantUpgradeExecutions)
        .innerJoin(
          upgradeCampaigns,
          eq(tenantUpgradeExecutions.campaignId, upgradeCampaigns.id),
        )
        .where(eq(tenantUpgradeExecutions.id, executionId));

      // Only bail for terminal campaign states. Paused campaigns may still
      // have in-flight executions that complete while paused.
      if (!execution || TERMINAL_CAMPAIGN_STATES.has(execution.campaignStatus))
        return null;

      const { campaignId, targetImageTag, channelId, failureThresholdPercent } =
        execution;

      // Check whether any execution is still in flight
      const [pendingResult] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(tenantUpgradeExecutions)
        .where(
          and(
            eq(tenantUpgradeExecutions.campaignId, campaignId),
            inArray(tenantUpgradeExecutions.status, PENDING_EXECUTION_STATES),
          ),
        );

      if (Number(pendingResult?.count ?? 0) > 0) return null;

      // All executions are terminal. Compute the final failure rate atomically
      // inside this transaction to prevent a race where checkCampaignHealth
      // (called for a concurrent failed execution) could mark the campaign
      // "failed" after we've already decided to promote it.
      const executionStats = await tx
        .select({
          count: sql<number>`count(*)`,
          status: tenantUpgradeExecutions.status,
        })
        .from(tenantUpgradeExecutions)
        .where(eq(tenantUpgradeExecutions.campaignId, campaignId))
        .groupBy(tenantUpgradeExecutions.status);

      let total = 0;
      let failedCount = 0;
      for (const stat of executionStats) {
        total += Number(stat.count);
        if (
          TERMINAL_EXECUTION_STATES.has(stat.status) &&
          stat.status !== "completed"
        ) {
          failedCount += Number(stat.count);
        }
      }

      const failureRate = total > 0 ? (failedCount / total) * 100 : 0;

      if (failureRate > failureThresholdPercent) {
        this.logger.warn(
          { campaignId, failureRate, threshold: failureThresholdPercent },
          "Campaign failure threshold exceeded at completion. Marking as failed.",
        );
        await tx
          .update(upgradeCampaigns)
          .set({ status: "failed" })
          .where(
            and(
              eq(upgradeCampaigns.id, campaignId),
              inArray(upgradeCampaigns.status, NON_TERMINAL_CAMPAIGN_STATES),
            ),
          );
        return null;
      }

      // Atomically transition campaign to completed — only one concurrent caller
      // wins this update; if the campaign was already completed by another
      // execution, .returning() yields an empty array and we bail out.
      const completed = await tx
        .update(upgradeCampaigns)
        .set({ status: "completed", completedAt: new Date() })
        .where(
          and(
            eq(upgradeCampaigns.id, campaignId),
            inArray(upgradeCampaigns.status, NON_TERMINAL_CAMPAIGN_STATES),
          ),
        )
        .returning();

      if (completed.length === 0) return null;

      // Set channel's currentImageTag as the single source of truth
      await tx
        .update(releaseChannels)
        .set({ currentImageTag: targetImageTag })
        .where(eq(releaseChannels.id, channelId));

      this.logger.info(
        { campaignId, channelId, targetImageTag },
        "Campaign completed. Channel image tag updated.",
      );

      // Auto-promote to the next channel in the chain if configured
      const [channel] = await tx
        .select({
          autoPromote: releaseChannels.autoPromote,
          nextChannelId: releaseChannels.nextChannelId,
        })
        .from(releaseChannels)
        .where(eq(releaseChannels.id, channelId));

      if (channel?.autoPromote && channel.nextChannelId) {
        this.logger.info(
          { from: channelId, to: channel.nextChannelId, targetImageTag },
          "Auto-promoting image to next channel.",
        );
        return { targetImageTag, nextChannelId: channel.nextChannelId };
      }

      return null;
    });

    // createCampaign must be called outside the transaction to avoid nesting.
    if (promotionDetails) {
      await this.createCampaign(
        promotionDetails.targetImageTag,
        promotionDetails.nextChannelId,
      );
    }
  }

  private async checkCampaignHealth(executionId: string) {
    const [execution] = await this.database
      .select({ campaignId: tenantUpgradeExecutions.campaignId })
      .from(tenantUpgradeExecutions)
      .where(eq(tenantUpgradeExecutions.id, executionId));

    if (!execution) return;

    const campaignId = execution.campaignId;

    const stats = await this.database
      .select({
        count: sql<number>`count(*)`,
        status: tenantUpgradeExecutions.status,
      })
      .from(tenantUpgradeExecutions)
      .where(eq(tenantUpgradeExecutions.campaignId, campaignId))
      .groupBy(tenantUpgradeExecutions.status);

    let total = 0;
    let failed = 0;

    for (const stat of stats) {
      total += Number(stat.count);
      if (stat.status === "failed") {
        failed += Number(stat.count);
      }
    }

    if (total === 0) return;

    const failureRate = (failed / total) * 100;

    const [campaign] = await this.database
      .select()
      .from(upgradeCampaigns)
      .where(eq(upgradeCampaigns.id, campaignId));

    if (campaign && failureRate > campaign.failureThresholdPercent) {
      this.logger.warn(
        {
          campaignId,
          failureRate,
          threshold: campaign.failureThresholdPercent,
        },
        "Campaign failure threshold exceeded. Pausing campaign.",
      );
      // Guard: only update if the campaign hasn't already reached a terminal
      // state (e.g. a concurrent completion check may have just completed it).
      await this.database
        .update(upgradeCampaigns)
        .set({ status: "failed" })
        .where(
          and(
            eq(upgradeCampaigns.id, campaignId),
            inArray(upgradeCampaigns.status, NON_TERMINAL_CAMPAIGN_STATES),
          ),
        );
    }
  }
}
