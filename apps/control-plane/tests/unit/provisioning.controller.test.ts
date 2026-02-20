import { createLogger } from "@vendin/logger";
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
  deleteMigrationJob: vi.fn(),
  getMigrationStatus: vi.fn(),
  startDeployService: vi.fn(),
  finalizeDeployment: vi.fn(),
  configureDomain: vi.fn(),
  rollbackResources: vi.fn(),
  activateTenant: vi.fn(),
  getOperationStatus: vi.fn(),
  createDatabaseSnapshot: vi.fn(),
  restoreDatabaseSnapshot: vi.fn(),
} as unknown as ProvisioningService;

const mockTenantService = {
  logProvisioningEvent: vi.fn().mockImplementation(async () => {}),
} as unknown as TenantService;

const mockDatabase = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue({}),
} as unknown as Database;

const controller = new ProvisioningController(
  mockTenantService,
  mockProvisioningService,
  mockDatabase,
  mockLogger,
);

const createRequest = (action: string, method = "POST") => {
  const body =
    method === "POST"
      ? JSON.stringify({ tenantId: "b0e41783-6236-47a6-a36c-8c345330a111" })
      : null;
  return new Request(`http://localhost/internal/provisioning/${action}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
};

describe("ProvisioningController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("should handle /migrations (POST)", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = createRequest("migrations");

    await controller.handleRequest(request);
    expect(mockProvisioningService.triggerMigrationJob).toHaveBeenCalledWith(
      tenantId,
      undefined
    );
  });

  it("should handle /service", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = createRequest("service");

    await controller.handleRequest(request);
    expect(mockProvisioningService.startDeployService).toHaveBeenCalledWith(
      tenantId,
      undefined
    );
  });

  // Keep other tests simple/abbreviated or include them if I want to be thorough.
  // I'll copy the rest of the file content from my read_file output but update valid parts.

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

  it("should handle /migrations?action=ensure (POST)", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = new Request(
      `http://localhost/internal/provisioning/migrations?action=ensure`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      },
    );

    await controller.handleRequest(request);
    expect(mockProvisioningService.ensureMigrationJob).toHaveBeenCalledWith(
      tenantId,
    );
  });

  it("should handle /migrations?action=delete (POST)", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = new Request(
      `http://localhost/internal/provisioning/migrations?action=delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      },
    );

    await controller.handleRequest(request);
    expect(mockProvisioningService.deleteMigrationJob).toHaveBeenCalledWith(
      tenantId,
    );
  });

  it("should handle /migrations/status (GET)", async () => {
    const request = new Request(
      "http://localhost/internal/provisioning/migrations/status?name=exec-123",
      { method: "GET" },
    );

    await controller.handleRequest(request);
    expect(mockProvisioningService.getMigrationStatus).toHaveBeenCalledWith(
      "exec-123",
    );
  });

  it("should handle /operations (GET)", async () => {
    const request = new Request(
      "http://localhost/internal/provisioning/operations?name=op-123",
      { method: "GET" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, reason: "Something went wrong" }),
      },
    );

    await controller.handleRequest(request);
    expect(mockProvisioningService.rollbackResources).toHaveBeenCalledWith(
      tenantId,
      "Something went wrong",
    );
  });

  // Add test for snapshot
  it("should handle /snapshot", async () => {
      const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
      const request = new Request(
          "http://localhost/internal/provisioning/snapshot",
          {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tenantId, snapshotName: "snap-1" })
          }
      );
      await controller.handleRequest(request);
      expect(mockProvisioningService.createDatabaseSnapshot).toHaveBeenCalledWith(tenantId, "snap-1");
  });

  // Add test for restore
  it("should handle /restore", async () => {
      const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
      const request = new Request(
          "http://localhost/internal/provisioning/restore",
          {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tenantId, snapshotName: "snap-1" })
          }
      );
      await controller.handleRequest(request);
      expect(mockProvisioningService.restoreDatabaseSnapshot).toHaveBeenCalledWith(tenantId, "snap-1");
  });
});
