import { z } from "zod";
import { type UpgradeService } from "../provisioning/upgrade.service";
import { type Logger } from "../../utils/logger";

export class CampaignController {
  constructor(
    private upgradeService: UpgradeService,
    private logger: Logger
  ) {}

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === "POST") {
        if (path === "/internal/campaigns") {
          return await this.handleCreate(request);
        }

        // Match /internal/campaigns/:id/next-batch
        const nextBatchMatch = path.match(/^\/internal\/campaigns\/([^\/]+)\/next-batch$/);
        if (nextBatchMatch) {
          return await this.handleNextBatch(nextBatchMatch[1]!, request);
        }

        // Match /internal/campaigns/executions/:id/status
        const statusMatch = path.match(/^\/internal\/campaigns\/executions\/([^\/]+)\/status$/);
        if (statusMatch) {
          return await this.handleUpdateStatus(statusMatch[1]!, request);
        }
      }

      return new Response("Not found", { status: 404 });
    } catch (error) {
      this.logger.error({ error }, "Error in campaign controller");
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  private async handleCreate(request: Request): Promise<Response> {
    const schema = z.object({
      targetImageTag: z.string(),
      channel: z.string()
    });

    const body = await request.json();
    const { targetImageTag, channel } = schema.parse(body);

    const id = await this.upgradeService.createCampaign(targetImageTag, channel);

    return new Response(JSON.stringify({ id }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  private async handleNextBatch(campaignId: string, request: Request): Promise<Response> {
    const batch = await this.upgradeService.getNextBatch(campaignId);

    return new Response(JSON.stringify({ batch }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  private async handleUpdateStatus(executionId: string, request: Request): Promise<Response> {
    const schema = z.object({
      status: z.string(),
      logs: z.any().optional(),
      error: z.string().optional()
    });

    const body = await request.json();
    const { status, logs, error } = schema.parse(body);

    const finalLogs = logs || (error ? { error } : undefined);

    await this.upgradeService.updateExecutionStatus(executionId, status, finalLogs);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
