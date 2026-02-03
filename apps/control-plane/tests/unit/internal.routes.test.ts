import { createLogger } from "@vendin/utils/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Database } from "../../src/database/database";
import { createInternalRoutes } from "../../src/domains/internal/internal.routes";
import { type ProvisioningService } from "../../src/domains/provisioning/provisioning.service";
import { type TenantService } from "../../src/domains/tenants/tenant.service";

// Mock dependencies
const mockLogger = createLogger();
const mockDatabase = {} as unknown as Database;
const mockService = {} as unknown as TenantService;
const mockProvisioningService = {} as unknown as ProvisioningService;
describe("Internal Routes", () => {
  let routes: ReturnType<typeof createInternalRoutes>;

  beforeEach(() => {
    vi.clearAllMocks();
    routes = createInternalRoutes({
      logger: mockLogger,
      tenantService: mockService,
      provisioningService: mockProvisioningService,
      db: mockDatabase,
    });
  });

  it("should route to provisioning controller for /internal/provisioning/*", async () => {
    const request = new Request("http://localhost/internal/other/path", {
      method: "POST",
    });

    const response = await routes.handleRequest(request);
    expect(response.status).toBe(404);
  });

  it("should return 404 for non-internal paths (though normally filtered before)", async () => {
    const minimalDatabase = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn(),
    } as unknown as Database;
    routes = createInternalRoutes({
      logger: mockLogger,
      tenantService: mockService,
      provisioningService: mockProvisioningService,
      db: minimalDatabase,
    });

    const response = await routes.handleRequest(
      new Request("http://localhost/internal/provisioning/database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: "b0e41783-6236-47a6-a36c-8c345330a111",
        }), // valid uuid
      }),
    );

    expect(response.status).not.toBe(404);
  });
});
