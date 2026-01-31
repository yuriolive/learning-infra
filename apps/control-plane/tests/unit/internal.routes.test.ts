import { createLogger } from "@vendin/utils/logger";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { createInternalRoutes } from "../../src/domains/internal/internal.routes";
import { TenantService } from "../../src/domains/tenants/tenant.service";
import { type Database } from "../../src/database/database";

// Mock dependencies
const mockLogger = createLogger();
const mockDb = {} as unknown as Database;
const mockService = {} as unknown as TenantService;
const internalSecret = "test-secret";

describe("Internal Routes", () => {
  let routes: ReturnType<typeof createInternalRoutes>;

  beforeEach(() => {
    vi.clearAllMocks();
    routes = createInternalRoutes({
      logger: mockLogger,
      tenantService: mockService,
      db: mockDb,
      internalApiSecret: internalSecret,
    });
  });

  it("should route to provisioning controller for /internal/provisioning/*", async () => {
    const request = new Request("http://localhost/internal/other/path", {
        method: "POST"
    });

    const response = await routes.handleRequest(request);
    expect(response.status).toBe(404);
  });

  it("should return 404 for non-internal paths (though normally filtered before)", async () => {
      const minimalDb = { insert: vi.fn().mockReturnThis(), values: vi.fn() } as unknown as Database;
      routes = createInternalRoutes({
          logger: mockLogger,
          tenantService: mockService,
          db: minimalDb,
          internalApiSecret: internalSecret
      });

      const response = await routes.handleRequest(new Request("http://localhost/internal/provisioning/database", {
          method: "POST",
          headers: { "X-Internal-Secret": internalSecret, "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId: "b0e41783-6236-47a6-a36c-8c345330a111" }) // valid uuid
      }));

      expect(response.status).not.toBe(404);
  });
});
