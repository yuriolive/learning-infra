import { createLogger } from "@vendin/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Database } from "../../../src/database/database";
import { UpgradeService } from "../../../src/domains/provisioning/upgrade.service";

const logger = createLogger({ logLevel: "silent" });

// Build a minimal select chain where the last method resolves `value`.
// For chains with .groupBy(), pass withGroupBy: true to extend the chain.
const selectChain = (value: unknown, options: { groupBy?: unknown } = {}) => {
  const whereResult = options.groupBy
    ? { groupBy: vi.fn().mockResolvedValue(options.groupBy) }
    : Promise.resolve(value);
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(whereResult),
    }),
  };
};

// Tx mock for the updateExecutionStatus inner transaction:
// updates execution status and tenant's currentImageTag.
const buildUpdateTx = () => ({
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockResolvedValue([
            { tenantId: "tenant-1", targetImageTag: "v2.0.0" },
          ]),
      }),
    }),
  }),
});

// Tx mock for the checkCampaignCompletion transaction.
const buildCompletionTx = (
  options: {
    executionRow?: {
      campaignId: string;
      targetImageTag: string;
      channelId: string;
      campaignStatus: string;
    } | null;
    pendingCount?: number;
    completedRows?: unknown[];
    channelRow?: {
      autoPromote: boolean;
      nextChannelId: string | null;
    } | null;
  } = {},
) => {
  const {
    executionRow = {
      campaignId: "camp-1",
      targetImageTag: "v2.0.0",
      channelId: "stable",
      campaignStatus: "running",
    },
    pendingCount = 0,
    completedRows = [{ id: "camp-1" }],
    channelRow = { autoPromote: false, nextChannelId: null },
  } = options;

  let selectCount = 0;
  let updateCount = 0;

  return {
    select: vi.fn().mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi
                .fn()
                .mockResolvedValue(executionRow ? [executionRow] : []),
            }),
          }),
        };
      }
      if (selectCount === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: pendingCount }]),
          }),
        };
      }
      // 3rd call: channel auto-promote check
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(channelRow ? [channelRow] : []),
        }),
      };
    }),
    update: vi.fn().mockImplementation(() => {
      updateCount++;
      if (updateCount === 1) {
        // Atomic campaign completion — must expose .returning()
        return {
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(completedRows),
            }),
          }),
        };
      }
      // 2nd call: update release channel's currentImageTag
      return {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    }),
  };
};

describe("UpgradeService", () => {
  let service: UpgradeService;
  let mockDatabase: Database;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDatabase = {
      transaction: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
    } as unknown as Database;

    service = new UpgradeService(mockDatabase, logger);
  });

  // -------------------------------------------------------------------------
  describe("createCampaign", () => {
    it("should create campaign and queue eligible tenants", async () => {
      const campaignId = "camp-1";

      vi.mocked(mockDatabase.transaction).mockImplementation((function_) => {
        let insertCount = 0;
        const tx = {
          insert: vi.fn().mockImplementation(() => {
            insertCount++;
            if (insertCount === 1) {
              return {
                values: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([{ id: campaignId }]),
                }),
              };
            }
            return { values: vi.fn().mockResolvedValue([]) };
          }),
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: "tenant-1" }]),
            }),
          }),
        };
        return function_(tx as unknown as never);
      });

      const id = await service.createCampaign("v1.0.0", "stable");
      expect(id).toBe(campaignId);
    });

    it("should return campaign id when no eligible tenants exist", async () => {
      const campaignId = "camp-2";

      vi.mocked(mockDatabase.transaction).mockImplementation((function_) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: campaignId }]),
            }),
          }),
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return function_(tx as unknown as never);
      });

      const id = await service.createCampaign("v1.0.0", "canary");
      expect(id).toBe(campaignId);
    });

    it("should throw if campaign insert returns nothing", async () => {
      vi.mocked(mockDatabase.transaction).mockImplementation((function_) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return function_(tx as unknown as never);
      });

      await expect(service.createCampaign("v1.0.0", "stable")).rejects.toThrow(
        "Failed to create campaign",
      );
    });
  });

  // -------------------------------------------------------------------------
  describe("getNextBatch", () => {
    it("should return empty batch when campaign is completed", async () => {
      mockDatabase.select = vi
        .fn()
        .mockReturnValue(
          selectChain([{ id: "camp-1", status: "completed", batchSize: 5 }]),
        );

      const result = await service.getNextBatch("camp-1");
      expect(result.batch).toHaveLength(0);
      expect(result.campaignStatus).toBe("completed");
    });

    it("should return empty batch when concurrency limit is reached", async () => {
      let selectCount = 0;
      mockDatabase.select = vi.fn().mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return selectChain([
            { id: "camp-1", status: "running", batchSize: 5 },
          ]);
        }
        // running-count query
        return selectChain([{ count: 5 }]);
      });
      mockDatabase.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

      const result = await service.getNextBatch("camp-1");
      expect(result.batch).toHaveLength(0);
      expect(result.campaignStatus).toBe("running");
    });

    it("should transition campaign from pending to running and return a batch", async () => {
      let selectCount = 0;
      mockDatabase.select = vi.fn().mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return selectChain([
            { id: "camp-1", status: "pending", batchSize: 5 },
          ]);
        }
        return selectChain([{ count: 0 }]);
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });
      mockDatabase.update = mockUpdate;

      const batchItem = {
        executionId: "exec-1",
        tenantId: "tenant-1",
        targetImageTag: "v1",
        currentImageTag: null,
      };
      mockDatabase.transaction = vi.fn().mockImplementation((function_) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      for: vi.fn().mockResolvedValue([batchItem]),
                    }),
                  }),
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return function_(tx as unknown as never);
      });

      const result = await service.getNextBatch("camp-1");
      expect(result.campaignStatus).toBe("running");
      expect(mockDatabase.update).toHaveBeenCalled(); // pending → running transition
    });
  });

  // -------------------------------------------------------------------------
  describe("updateExecutionStatus", () => {
    it("should update status and tenant image tag on completion", async () => {
      vi.mocked(mockDatabase.transaction)
        .mockImplementationOnce((function_) =>
          function_(buildUpdateTx() as never),
        )
        // checkCampaignCompletion tx — bail early (another process already won)
        .mockImplementationOnce((function_) =>
          function_(buildCompletionTx({ completedRows: [] }) as never),
        );

      await expect(
        service.updateExecutionStatus("exec-1", "completed"),
      ).resolves.not.toThrow();
    });

    it("should update status without triggering health check for non-failure", async () => {
      vi.mocked(mockDatabase.transaction).mockImplementation((function_) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return function_(tx as unknown as never);
      });

      await expect(
        service.updateExecutionStatus("exec-1", "migrating"),
      ).resolves.not.toThrow();
    });

    it("should run campaign health check on failure status", async () => {
      vi.mocked(mockDatabase.transaction)
        .mockImplementationOnce((function_) => {
          // updateExecutionStatus tx — only needs update (no select for "failed")
          const tx = {
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
          return function_(tx as never);
        })
        // checkCampaignCompletion tx — campaign already "failed" by health check,
        // so bail early after the first select.
        .mockImplementationOnce((function_) =>
          function_(
            buildCompletionTx({
              executionRow: {
                campaignId: "camp-1",
                targetImageTag: "v2.0.0",
                channelId: "stable",
                campaignStatus: "failed",
              },
            }) as never,
          ),
        );

      // checkCampaignHealth issues 3 selects:
      //   1. execution → campaignId
      //   2. stats grouped by status
      //   3. campaign record (to check threshold)
      let selectCount = 0;
      mockDatabase.select = vi.fn().mockImplementation(() => {
        selectCount++;
        const call = selectCount;
        if (call === 1) return selectChain([{ campaignId: "camp-1" }]);
        if (call === 2) {
          // stats query uses .groupBy — 1 failed out of 10 total = 10%
          return selectChain(undefined, {
            groupBy: [
              { count: 1, status: "failed" },
              { count: 9, status: "completed" },
            ],
          });
        }
        // 3rd: campaign — threshold 50%, so 10% < 50%, no update
        return selectChain([
          { id: "camp-1", failureThresholdPercent: 50, status: "running" },
        ]);
      });

      await expect(
        service.updateExecutionStatus("exec-1", "failed"),
      ).resolves.not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  describe("checkCampaignCompletion (via updateExecutionStatus)", () => {
    it("should bail early when campaign is already in a terminal state", async () => {
      vi.mocked(mockDatabase.transaction)
        .mockImplementationOnce((function_) =>
          function_(buildUpdateTx() as never),
        )
        .mockImplementationOnce((function_) =>
          function_(
            buildCompletionTx({
              executionRow: {
                campaignId: "camp-1",
                targetImageTag: "v2.0.0",
                channelId: "stable",
                campaignStatus: "completed",
              },
            }) as never,
          ),
        );

      await expect(
        service.updateExecutionStatus("exec-1", "completed"),
      ).resolves.not.toThrow();
    });

    it("should bail early when there are still pending executions", async () => {
      vi.mocked(mockDatabase.transaction)
        .mockImplementationOnce((function_) =>
          function_(buildUpdateTx() as never),
        )
        .mockImplementationOnce((function_) =>
          function_(buildCompletionTx({ pendingCount: 3 }) as never),
        );

      await expect(
        service.updateExecutionStatus("exec-1", "completed"),
      ).resolves.not.toThrow();
    });

    it("should bail early when another process already completed the campaign", async () => {
      vi.mocked(mockDatabase.transaction)
        .mockImplementationOnce((function_) =>
          function_(buildUpdateTx() as never),
        )
        .mockImplementationOnce((function_) =>
          function_(buildCompletionTx({ completedRows: [] }) as never),
        );

      await expect(
        service.updateExecutionStatus("exec-1", "completed"),
      ).resolves.not.toThrow();
    });

    it("should update channel image tag when campaign completes", async () => {
      const completionTx = buildCompletionTx();

      vi.mocked(mockDatabase.transaction)
        .mockImplementationOnce((function_) =>
          function_(buildUpdateTx() as never),
        )
        .mockImplementationOnce((function_) =>
          function_(completionTx as never),
        );

      await service.updateExecutionStatus("exec-1", "completed");

      // Two update calls: (1) atomic campaign status, (2) channel currentImageTag
      expect(
        (completionTx.update as ReturnType<typeof vi.fn>).mock.calls,
      ).toHaveLength(2);
    });

    it("should trigger auto-promotion when autoPromote is enabled on the channel", async () => {
      const completionTx = buildCompletionTx({
        channelRow: { autoPromote: true, nextChannelId: "canary" },
      });

      // createCampaign (auto-promote) also runs a transaction
      const promotionTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "camp-promoted" }]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(mockDatabase.transaction)
        .mockImplementationOnce((function_) =>
          function_(buildUpdateTx() as never),
        )
        .mockImplementationOnce((function_) => function_(completionTx as never))
        .mockImplementationOnce((function_) => function_(promotionTx as never));

      await service.updateExecutionStatus("exec-1", "completed");

      // Three transaction calls: updateExecutionStatus, checkCampaignCompletion, createCampaign
      expect(mockDatabase.transaction).toHaveBeenCalledTimes(3);
    });
  });
});
