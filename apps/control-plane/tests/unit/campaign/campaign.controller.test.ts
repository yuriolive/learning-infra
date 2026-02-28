import { createLogger } from "@vendin/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CampaignController } from "../../../src/domains/internal/campaign.controller";
import { type UpgradeService } from "../../../src/domains/provisioning/upgrade.service";

const mockLogger = createLogger({ logLevel: "silent" });

const mockUpgradeService = {
  createCampaign: vi.fn(),
  getNextBatch: vi.fn(),
  updateExecutionStatus: vi.fn(),
} as unknown as UpgradeService;

const controller = new CampaignController(mockUpgradeService, mockLogger);

const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("CampaignController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /internal/campaigns", () => {
    it("should create a campaign and return its id", async () => {
      vi.mocked(mockUpgradeService.createCampaign).mockResolvedValue(
        "campaign-123",
      );

      const request = post("/internal/campaigns", {
        targetImageTag: "v1.2.3",
        channel: "stable",
      });

      const response = await controller.handleRequest(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ id: "campaign-123" });
      expect(mockUpgradeService.createCampaign).toHaveBeenCalledWith(
        "v1.2.3",
        "stable",
      );
    });

    it("should return 500 on createCampaign error", async () => {
      vi.mocked(mockUpgradeService.createCampaign).mockRejectedValue(
        new Error("DB error"),
      );

      const request = post("/internal/campaigns", {
        targetImageTag: "v1.2.3",
        channel: "stable",
      });

      const response = await controller.handleRequest(request);
      expect(response.status).toBe(500);
    });
  });

  describe("POST /internal/campaigns/:id/next-batch", () => {
    it("should return the next batch for a campaign", async () => {
      const batchResult = {
        batch: [{ tenantId: "t1", executionId: "e1", targetImageTag: "v1" }],
        campaignStatus: "running",
      };
      vi.mocked(mockUpgradeService.getNextBatch).mockResolvedValue(batchResult);

      const request = post("/internal/campaigns/campaign-123/next-batch", {});
      const response = await controller.handleRequest(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(batchResult);
      expect(mockUpgradeService.getNextBatch).toHaveBeenCalledWith(
        "campaign-123",
      );
    });
  });

  describe("POST /internal/campaigns/executions/:id/status", () => {
    it("should update execution status", async () => {
      vi.mocked(mockUpgradeService.updateExecutionStatus).mockResolvedValue();

      const request = post("/internal/campaigns/executions/exec-456/status", {
        status: "completed",
      });

      const response = await controller.handleRequest(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });
      expect(mockUpgradeService.updateExecutionStatus).toHaveBeenCalledWith(
        "exec-456",
        "completed",
        undefined,
      );
    });

    it("should pass logs when provided", async () => {
      vi.mocked(mockUpgradeService.updateExecutionStatus).mockResolvedValue();

      const logs = { step: "migration", result: "ok" };
      const request = post("/internal/campaigns/executions/exec-456/status", {
        status: "migrating",
        logs,
      });

      await controller.handleRequest(request);

      expect(mockUpgradeService.updateExecutionStatus).toHaveBeenCalledWith(
        "exec-456",
        "migrating",
        logs,
      );
    });

    it("should combine error string into logs when logs absent", async () => {
      vi.mocked(mockUpgradeService.updateExecutionStatus).mockResolvedValue();

      const request = post("/internal/campaigns/executions/exec-456/status", {
        status: "failed",
        error: "timeout",
      });

      await controller.handleRequest(request);

      expect(mockUpgradeService.updateExecutionStatus).toHaveBeenCalledWith(
        "exec-456",
        "failed",
        { error: "timeout" },
      );
    });

    it("should reject invalid status values", async () => {
      const request = post("/internal/campaigns/executions/exec-456/status", {
        status: "invalid_status",
      });

      const response = await controller.handleRequest(request);
      expect(response.status).toBe(500);
      expect(mockUpgradeService.updateExecutionStatus).not.toHaveBeenCalled();
    });
  });

  describe("unknown routes", () => {
    it("should return 404 for GET requests", async () => {
      const request = new Request("http://localhost/internal/campaigns", {
        method: "GET",
      });
      const response = await controller.handleRequest(request);
      expect(response.status).toBe(404);
    });

    it("should return 404 for unrecognised POST paths", async () => {
      const request = post("/internal/campaigns/unknown-path", {});
      const response = await controller.handleRequest(request);
      expect(response.status).toBe(404);
    });
  });
});
