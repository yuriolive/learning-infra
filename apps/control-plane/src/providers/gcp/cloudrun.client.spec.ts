import { ServicesClient } from "@google-cloud/run";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CloudRunProvider } from "./cloudrun.client";

// Mock the external dependencies
vi.mock("@google-cloud/run");
vi.mock("@vendin/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe("CloudRunProvider", () => {
  let provider: CloudRunProvider;
  let mockCreateService: any;
  const originalEnvironment = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnvironment };
    process.env.GCP_PROJECT_ID = "test-project";
    process.env.GCP_TENANT_SERVICE_ACCOUNT =
      "test-sa@test-project.iam.gserviceaccount.com";
    process.env.GCP_REGION = "us-central1";

    mockCreateService = vi.fn();

    // Mock the ServicesClient implementation
    (ServicesClient as unknown as any).mockImplementation(() => ({
      createService: mockCreateService,
    }));
  });

  afterEach(() => {
    process.env = originalEnvironment;
    vi.clearAllMocks();
  });

  it("should initialize correctly with environment variables", () => {
    provider = new CloudRunProvider();
    expect(provider).toBeDefined();
  });

  it("should throw if GCP_PROJECT_ID is missing", () => {
    delete process.env.GCP_PROJECT_ID;
    expect(() => new CloudRunProvider()).toThrow(
      "GCP_PROJECT_ID environment variable is not set",
    );
  });

  it("should throw if GCP_TENANT_SERVICE_ACCOUNT is missing", () => {
    delete process.env.GCP_TENANT_SERVICE_ACCOUNT;
    expect(() => new CloudRunProvider()).toThrow(
      "GCP_TENANT_SERVICE_ACCOUNT environment variable is not set",
    );
  });

  it("should provision a tenant service successfully", async () => {
    provider = new CloudRunProvider();
    const tenantId = "123";
    const databaseUrl = "postgres://user:pass@host/db";
    const expectedUrl = "https://tenant-123-xyz.run.app";

    // Mock LRO response
    const mockOperation = {
      name: "projects/test-project/locations/us-central1/operations/123",
      promise: vi.fn().mockResolvedValue([
        {
          uri: expectedUrl,
        },
      ]),
    };
    mockCreateService.mockResolvedValue([mockOperation]);

    const url = await provider.provisionTenantService(tenantId, databaseUrl);

    expect(url).toBe(expectedUrl);
    expect(mockCreateService).toHaveBeenCalledTimes(1);

    // Verify call arguments
    const callArguments = mockCreateService.mock.calls[0][0];
    expect(callArguments.parent).toBe(
      "projects/test-project/locations/us-central1",
    );
    expect(callArguments.serviceId).toBe("tenant-123");

    // Check v2 structure
    const template = callArguments.service.template;
    expect(template.serviceAccount).toBe(
      process.env.GCP_TENANT_SERVICE_ACCOUNT,
    );
    expect(template.scaling.minInstanceCount).toBe(0);

    expect(template.containers[0].env).toEqual(
      expect.arrayContaining([
        { name: "DATABASE_URL", value: databaseUrl },
        { name: "NODE_ENV", value: "production" },
      ]),
    );

    // Check if secrets are generated
    const environmentVariables = template.containers[0].env;
    const cookieSecret = environmentVariables.find(
      (variable: any) => variable.name === "COOKIE_SECRET",
    );
    const jwtSecret = environmentVariables.find(
      (variable: any) => variable.name === "JWT_SECRET",
    );

    expect(cookieSecret).toBeDefined();
    expect(cookieSecret.value).toHaveLength(64); // 32 bytes hex = 64 chars
    expect(jwtSecret).toBeDefined();
    expect(jwtSecret.value).toHaveLength(64);

    // Check resources
    expect(template.containers[0].resources).toEqual({
      limits: {
        cpu: "1000m",
        memory: "1024Mi",
      },
    });
  });

  it("should throw error if service creation fails", async () => {
    provider = new CloudRunProvider();
    const error = new Error("GCP Error");
    mockCreateService.mockRejectedValue(error);

    await expect(
      provider.provisionTenantService("123", "db_url"),
    ).rejects.toThrow("GCP Error");
  });

  it("should throw error if returned URL is missing", async () => {
    provider = new CloudRunProvider();
    const mockOperation = {
      name: "op",
      promise: vi.fn().mockResolvedValue([
        {
          uri: undefined, // No URL
        },
      ]),
    };
    mockCreateService.mockResolvedValue([mockOperation]);

    await expect(
      provider.provisionTenantService("123", "db_url"),
    ).rejects.toThrow("Cloud Run service created but URL is missing");
  });
});
