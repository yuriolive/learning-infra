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
  runMigrations: vi.fn(),
  deployService: vi.fn(),
  configureDomain: vi.fn(),
  activateTenant: vi.fn(),
  rollbackResources: vi.fn(),
} as unknown as TenantService;

const internalSecret = "super-secret";
const controller = new ProvisioningController(
  mockService,
  mockDb,
  mockLogger,
  internalSecret,
);

describe("ProvisioningController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if unauthorized", async () => {
    const request = new Request("http://localhost/internal/provisioning/database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "123" }),
    });

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(401);
  });

  it("should return 401 if wrong secret", async () => {
    const request = new Request("http://localhost/internal/provisioning/database", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": "wrong"
      },
      body: JSON.stringify({ tenantId: "123" }),
    });

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(401);
  });

  it("should handle /database successfully", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    (mockService.provisionDatabase as any).mockResolvedValue({ databaseUrl: "postgres://..." });

    const request = new Request("http://localhost/internal/provisioning/database", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret
      },
      body: JSON.stringify({ tenantId }),
    });

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(200);
    expect(mockService.provisionDatabase).toHaveBeenCalledWith(tenantId);
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // start and complete
  });

  it("should handle failure and log it", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    (mockService.provisionDatabase as any).mockRejectedValue(new Error("DB Error"));

    const request = new Request("http://localhost/internal/provisioning/database", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret
      },
      body: JSON.stringify({ tenantId }),
    });

    const response = await controller.handleRequest(request);
    expect(response.status).toBe(500);

    expect(mockDb.insert).toHaveBeenCalledTimes(2); // start and failed
  });

  it("should handle /migrations", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = new Request("http://localhost/internal/provisioning/migrations", {
      method: "POST",
      headers: { "X-Internal-Secret": internalSecret, "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });

    await controller.handleRequest(request);
    expect(mockService.runMigrations).toHaveBeenCalledWith(tenantId);
  });

   it("should handle /rollback", async () => {
    const tenantId = "b0e41783-6236-47a6-a36c-8c345330a111";
    const request = new Request("http://localhost/internal/provisioning/rollback", {
      method: "POST",
      headers: { "X-Internal-Secret": internalSecret, "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });

    await controller.handleRequest(request);
    expect(mockService.rollbackResources).toHaveBeenCalledWith(tenantId);
  });
});
