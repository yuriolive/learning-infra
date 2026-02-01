import { GoogleAuth } from "../../utils/google-auth";
import { type Logger } from "../../utils/logger";

export interface ExecutionsClientConfig {
  credentialsJson?: string | undefined;
  projectId: string;
  location: string;
  logger: Logger;
}

interface CreateExecutionOptions {
  parent: string;
  execution: {
    argument: string;
  };
}

export interface ProvisionTenantPayload {
  tenantId: string;
  baseUrl: string;
  internalApiKey: string | undefined;
}

export class GcpWorkflowsClient {
  private auth: GoogleAuth | null = null;
  private logger: Logger;
  private projectId: string;
  private location: string;

  constructor(config: ExecutionsClientConfig) {
    this.logger = config.logger;
    this.projectId = config.projectId;
    this.location = config.location;

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

  async triggerProvisionTenant(payload: ProvisionTenantPayload): Promise<void> {
    const workflowName = `projects/${this.projectId}/locations/${this.location}/workflows/provision-tenant`;

    this.logger.info(
      { tenantId: payload.tenantId, workflowName },
      "Triggering provisioning workflow",
    );

    await this.createExecution({
      parent: workflowName,
      execution: {
        argument: JSON.stringify(payload),
      },
    });
  }

  // Kept public for flexibility but intended to be used by specific methods
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
        {
          error,
          parent: options.parent,
          errorMessage: (error as Error).message,
          errorStack: (error as Error).stack,
        },
        "Failed to create workflow execution",
      );
      throw error;
    }
  }
}
