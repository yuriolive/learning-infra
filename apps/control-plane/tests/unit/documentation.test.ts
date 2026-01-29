import { describe, expect, it, vi } from "vitest";

// Mock database to avoid connection errors
vi.mock("../../src/database/database", () => ({
  createDatabase: () => ({}),
}));

import { type Environment } from "../../src/config";
import worker from "../../src/index";

describe("Documentation Endpoints", () => {
  const environment = {
    DATABASE_URL: "postgres://mock:5432/mock",
    UPSTASH_REDIS_URL: "redis://mock:5432",
  };

  it("should return documentation HTML at /docs", async () => {
    const request = new Request("http://localhost/docs");
    const response = await worker.fetch(
      request,
      environment as unknown as Environment,
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html");
    // Verify the configuration structure
    expect(text).toContain('url: "/openapi.json"');
    expect(text).toContain("spec: {");
    expect(text).toContain(
      "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.43.14",
    );
  });

  it("should return OpenAPI spec at /openapi.json", async () => {
    const request = new Request("http://localhost/openapi.json");
    const response = await worker.fetch(
      request,
      environment as unknown as Environment,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(data.openapi).toBe("3.1.0");
    expect(data.info.title).toBe("Vendin Control Plane API");
  });
});
