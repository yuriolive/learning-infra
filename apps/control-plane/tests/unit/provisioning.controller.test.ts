import { createLogger } from "@vendin/utils/logger";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ProvisioningController } from "../../src/domains/internal/provisioning.controller";
import { TenantService } from "../../src/domains/tenants/tenant.service";
import { type Database } from "../../src/database/database";

// Mock dependencies
const mockLogger = createLogger();
const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
} as unknown as Database;

const mockService = {
  provisionDatabase: vi.fn(),
  triggerMigration: vi.fn(),
  getMigrationStatus: vi.fn(),
  deployService: vi.fn(),
  configureDomain: vi.fn(),
  activateTenant: vi.fn(),
  rollbackResources: vi.fn(),
} as unknown as TenantService;

const TEST_INTERNAL_KEY = "test-internal-api-key-123";
const controller = new ProvisioningController(
  mockService,
  mockDb,
  mockLogger,
  TEST_INTERNAL_KEY,
);

describe("ProvisioningController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (action: string, key: string = TEST_INTERNAL_KEY, method = "POST") => {
    return new Request(`http://localhost/internal/provisioning/${action}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": key,
      },
      body: method === "POST" ? JSON.stringify({ tenantId: "b0e41783-6236-47a6-a36c-8c345330a111" }) : undefined,
    });
  };

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
    (mockService.provisionDatabase as any).mockResolvedValue({ databaseUrl: "postgres://..." });

    const request = createRequest("database");

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(200);
    expect(mockService.provisionDatabase).toHaveBeenCalledWith(tenantId);
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // start and complete
  });

  it("should handle failure and log it", async () => {
    (mockService.provisionDatabase as any).mockRejectedValue(new Error("DB Error"));

    const request = createRequest("database");

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(500);

    expect(mockDb.insert).toHaveBeenCalledTimes(2); // start and failed
  });

  it("should log error but continue if logEvent fails", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    (mockService.provisionDatabase as any).mockResolvedValue({ databaseUrl: "postgres://..." });
    // Mock db.insert to fail
    (mockDb.insert as any).mockImplementationOnce(() => { throw new Error("DB Log Error"); });

    const request = createRequest("database");

    const response = await controller.handleRequest(request);

    // Should still succeed even if logging fails
    expect(response.status).toBe(200);
    expect(mockService.provisionDatabase).toHaveBeenCalledWith(tenantId);
  });

  it("should handle /migrations (POST)", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = createRequest("migrations");

    await controller.handleRequest(request);
    expect(mockService.triggerMigration).toHaveBeenCalledWith(tenantId);
  });

  it("should handle /migrations/status (GET)", async () => {
    const request = new Request("http://localhost/internal/provisioning/migrations/status?name=exec-123", {
      method: "GET",
      headers: {
        "X-Internal-Key": TEST_INTERNAL_KEY,
      },
    });

    await controller.handleRequest(request);
    expect(mockService.getMigrationStatus).toHaveBeenCalledWith("exec-123");
  });

   it("should handle /rollback", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = createRequest("rollback");

    await controller.handleRequest(request);
    expect(mockService.rollbackResources).toHaveBeenCalledWith(tenantId);
  });
});
