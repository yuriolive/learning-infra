import { createLogger } from "@vendin/utils/logger";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { type Database } from "../../src/database/database";
import { ProvisioningController } from "../../src/domains/internal/provisioning.controller";

import type { ProvisioningService } from "../../src/domains/provisioning/provisioning.service";
import type { TenantService } from "../../src/domains/tenants/tenant.service";

// Mock dependencies
const mockLogger = createLogger();
const mockProvisioningService = {
  provisionDatabase: vi.fn(),
  triggerMigrationJob: vi.fn(),
  ensureMigrationJob: vi.fn(),
  getMigrationStatus: vi.fn(),
  startDeployService: vi.fn(),
  finalizeDeployment: vi.fn(),
  configureDomain: vi.fn(),
  rollbackResources: vi.fn(),
  activateTenant: vi.fn(),
  getOperationStatus: vi.fn(),
} as unknown as ProvisioningService;

const mockTenantService = {
  logProvisioningEvent: vi.fn().mockImplementation(async () => {}),
} as unknown as TenantService;

const mockDatabase = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue({}),
} as unknown as Database;

const TEST_INTERNAL_KEY = "test-internal-api-key-123";
const controller = new ProvisioningController(
  mockTenantService,
  mockProvisioningService,
  mockDatabase,
  mockLogger,
  TEST_INTERNAL_KEY,
);

const createRequest = (
  action: string,
  key: string = TEST_INTERNAL_KEY,
  method = "POST",
) => {
  const body =
    method === "POST"
      ? JSON.stringify({ tenantId: "b0e41783-6236-47a6-a36c-8c345330a111" })
      : null;
  return new Request(`http://localhost/internal/provisioning/${action}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": key,
    },
    body,
  });
};

describe("ProvisioningController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if unauthorized", async () => {
    const request = createRequest("database", "");
    request.headers.delete("X-Internal-Key");

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(401);
  });

  it("should return 401 if wrong key", async () => {
    const request = createRequest("database", "wrong-key");

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(401);
  });

  it("should handle /database successfully", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    vi.mocked(mockProvisioningService.provisionDatabase).mockResolvedValue({
      databaseUrl: "postgres://...",
    });

    const request = createRequest("database");

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(200);
    expect(mockProvisioningService.provisionDatabase).toHaveBeenCalledWith(
      tenantId,
    );
  });

  it("should handle failure and log it", async () => {
    vi.mocked(mockProvisioningService.provisionDatabase).mockRejectedValue(
      new Error("DB Error"),
    );

    const request = createRequest("database");

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toEqual({ error: "DB Error" });
  });

  it("should handle /migrations (POST)", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = createRequest("migrations");

    await controller.handleRequest(request);
    expect(mockProvisioningService.triggerMigrationJob).toHaveBeenCalledWith(
      tenantId,
    );
  });

  it("should handle /migrations?action=ensure (POST)", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = new Request(
      `http://localhost/internal/provisioning/migrations?action=ensure`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": TEST_INTERNAL_KEY,
        },
        body: JSON.stringify({ tenantId }),
      },
    );

    await controller.handleRequest(request);
    expect(mockProvisioningService.ensureMigrationJob).toHaveBeenCalledWith(
      tenantId,
    );
  });

  it("should handle /migrations/status (GET)", async () => {
    const request = new Request(
      "http://localhost/internal/provisioning/migrations/status?name=exec-123",
      {
        method: "GET",
        headers: {
          "X-Internal-Key": TEST_INTERNAL_KEY,
        },
      },
    );

    await controller.handleRequest(request);
    expect(mockProvisioningService.getMigrationStatus).toHaveBeenCalledWith(
      "exec-123",
    );
  });

  it("should handle /operations (GET)", async () => {
    const request = new Request(
      "http://localhost/internal/provisioning/operations?name=op-123",
      {
        method: "GET",
        headers: {
          "X-Internal-Key": TEST_INTERNAL_KEY,
        },
      },
    );

    vi.mocked(mockProvisioningService.getOperationStatus).mockResolvedValue({
      done: true,
      response: { foo: "bar" },
    });

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(200);
    expect(mockProvisioningService.getOperationStatus).toHaveBeenCalledWith(
      "op-123",
    );
  });

  it("should handle /operations (GET) missing name", async () => {
    const request = new Request(
      "http://localhost/internal/provisioning/operations",
      {
        method: "GET",
        headers: {
          "X-Internal-Key": TEST_INTERNAL_KEY,
        },
      },
    );

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(400);
  });

  it("should handle /service", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = createRequest("service");

    await controller.handleRequest(request);
    expect(mockProvisioningService.startDeployService).toHaveBeenCalledWith(
      tenantId,
    );
  });

  it("should handle /finalize", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = createRequest("finalize");

    await controller.handleRequest(request);
    expect(mockProvisioningService.finalizeDeployment).toHaveBeenCalledWith(
      tenantId,
    );
  });

  it("should handle /domain", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = createRequest("domain");

    await controller.handleRequest(request);
    expect(mockProvisioningService.configureDomain).toHaveBeenCalledWith(
      tenantId,
    );
  });

  it("should handle /activate", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = createRequest("activate");

    await controller.handleRequest(request);
    expect(mockProvisioningService.activateTenant).toHaveBeenCalledWith(
      tenantId,
    );
  });

  it("should handle /rollback", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = new Request(
      "http://localhost/internal/provisioning/rollback",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": TEST_INTERNAL_KEY,
        },
        body: JSON.stringify({
          tenantId,
          reason: "Something went wrong",
        }),
      },
    );

    await controller.handleRequest(request);
    expect(mockProvisioningService.rollbackResources).toHaveBeenCalledWith(
      tenantId,
      "Something went wrong",
    );
  });

  it("should return 400 if /rollback has invalid body", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = new Request(
      "http://localhost/internal/provisioning/rollback",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": TEST_INTERNAL_KEY,
        },
        body: JSON.stringify({
          tenantId,
          reason: 123, // Invalid: should be a string
        }),
      },
    );

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error[0].path).toContain("reason");
  });

  it("should return 400 for invalid action", async () => {
    const request = createRequest("unknown-action");

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({ error: "Invalid action" });
  });
});
