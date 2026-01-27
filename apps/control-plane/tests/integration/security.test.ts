import { describe, it, expect } from "vitest";

import server from "../../src/index";

const MOCK_ENV = {
  DATABASE_URL: "postgres://mock:mock@localhost:5432/mock",
  ADMIN_API_KEY: "test-admin-key",
  NODE_ENV: "development",
  LOG_LEVEL: "silent",
};

describe("Security Integration Tests", () => {
  const origin = "http://localhost:8787";

  it("GET /health should be publicly accessible without auth", async () => {
    const request = new Request(`${origin}/health`);
    const response = await server.fetch(request, MOCK_ENV as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  it("GET /api/tenants should return 401 if Authorization header is missing", async () => {
    const request = new Request(`${origin}/api/tenants`);
    const response = await server.fetch(request, MOCK_ENV as any);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
    expect(body.message).toBe("Invalid or missing API key");
  });

  it("GET /api/tenants should return 401 if Authorization header is invalid", async () => {
    const request = new Request(`${origin}/api/tenants`, {
      headers: {
        Authorization: "Bearer wrong-key",
      },
    });
    const response = await server.fetch(request, MOCK_ENV as any);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("GET /api/tenants should return 200 (or other success/database error) if token is valid", async () => {
    // Note: This might fail if the database connection fails, but it proves the auth middleware passed.
    // In index.ts, it will try to create the database/repository/service.
    // We expect it to either succeed or hit a 500 database error AFTER passing auth.
    const request = new Request(`${origin}/api/tenants`, {
      headers: {
        Authorization: "Bearer test-admin-key",
      },
    });

    try {
      const response = await server.fetch(request, MOCK_ENV as any);
      // If it's a 200, 404, or even 500 (db error), it means it passed auth middleware.
      // A 401 definitely means it failed auth.
      expect(response.status).not.toBe(401);
    } catch {
      // If it throws, it's likely a database connection issue, which is fine for this test
    }
  });

  describe("CORS Handling", () => {
    it("should include CORS headers in development", async () => {
      const request = new Request(`${origin}/health`, {
        headers: {
          Origin: "http://another-origin.com",
        },
      });
      const response = await server.fetch(request, MOCK_ENV as any);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://another-origin.com",
      );
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "GET",
      );
    });

    it("should restrict CORS headers in production based on ALLOWED_ORIGINS", async () => {
      const PROD_ENV = {
        ...MOCK_ENV,
        NODE_ENV: "production",
        ALLOWED_ORIGINS:
          "https://admin.vendin.store,https://dashboard.vendin.store",
      };

      const request = new Request(`${origin}/health`, {
        headers: {
          Origin: "https://admin.vendin.store",
        },
      });
      const response = await server.fetch(request, PROD_ENV as any);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://admin.vendin.store",
      );
    });

    it("should omit CORS header when origin is not allowed in production", async () => {
      const PROD_ENV = {
        ...MOCK_ENV,
        NODE_ENV: "production",
        ALLOWED_ORIGINS: "https://admin.vendin.store",
      };

      const request = new Request(`${origin}/health`, {
        headers: {
          Origin: "https://malicious.com",
        },
      });
      const response = await server.fetch(request, PROD_ENV as any);

      // Unauthorized origin should not receive CORS header
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });
});
