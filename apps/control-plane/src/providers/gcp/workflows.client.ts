import { GoogleAuth } from "../../utils/google-auth";
import { type Logger } from "../../utils/logger";

export interface ExecutionsClientConfig {
  credentialsJson?: string | undefined;
  logger: Logger;
}

interface CreateExecutionOptions {
  parent: string;
  execution: {
    argument: string;
  };
}

export class GcpWorkflowsClient {
  private auth: GoogleAuth | null = null;
  private logger: Logger;

  constructor(config: ExecutionsClientConfig) {
    this.logger = config.logger;
    if (config.credentialsJson) {
      try {
        this.auth = new GoogleAuth(config.credentialsJson);
      } catch (error) {
        this.logger.error(
          { error },
          "Failed to initialize Google Auth for Workflows",
        );
      }
    }
  }

  async createExecution(options: CreateExecutionOptions): Promise<void> {
    if (!this.auth) {
      throw new Error(
        "GCP Credentials not configured, cannot execute workflow",
      );
    }

    try {
      const accessToken = await this.auth.getAccessToken();
      const url = `https://workflowexecutions.googleapis.com/v1/${options.parent}/executions`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options.execution),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Workflow execution failed: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();
      this.logger.info(
        { executionName: (data as { name: string }).name },
        "Workflow execution created successfully",
      );
    } catch (error) {
      this.logger.error(
        { error, parent: options.parent },
        "Failed to create workflow execution",
      );
      throw error;
    }
  }
}
