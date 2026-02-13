import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthMiddleware, createCorsMiddleware, wrapResponse, MiddlewareOptions } from "./middleware";
import { Logger } from "./utils/logger";

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe("Middleware", () => {
  const options: MiddlewareOptions = {
    logger: mockLogger as unknown as Logger,
    adminApiKey: "secret-key",
    nodeEnv: "test",
    allowedOrigins: ["https://example.com"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAuthMiddleware", () => {
    it("should return null on successful authentication", async () => {
      const middleware = createAuthMiddleware(options);
      const req = new Request("http://localhost", {
        headers: { Authorization: "Bearer secret-key" },
      });
      const result = middleware(req);
      expect(result).toBeNull();
    });

    it("should fail if adminApiKey is not configured", async () => {
      const middleware = createAuthMiddleware({ ...options, adminApiKey: undefined });
      const req = new Request("http://localhost");
      const result = middleware(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);
      const body = await result?.json();
      expect(body.message).toBe("Server authentication check not configured");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should fail if Authorization header is missing", async () => {
      const middleware = createAuthMiddleware(options);
      const req = new Request("http://localhost");
      const result = middleware(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("should fail if Authorization header is invalid format", async () => {
      const middleware = createAuthMiddleware(options);
      const req = new Request("http://localhost", {
        headers: { Authorization: "Basic key" },
      });
      const result = middleware(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("should fail if token does not match", async () => {
      const middleware = createAuthMiddleware(options);
      const req = new Request("http://localhost", {
        headers: { Authorization: "Bearer wrong-key" },
      });
      const result = middleware(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    // Testing areEqual timing attack prevention logic implicitly:
    // Ensure partial matches fail.
    it("should fail on partial match token", async () => {
        const middleware = createAuthMiddleware(options);
        const req = new Request("http://localhost", {
            headers: { Authorization: "Bearer secret" }, // shorter
        });
        const result = middleware(req);
        expect(result?.status).toBe(401);
    });
  });

  describe("createCorsMiddleware", () => {
    it("should allow all origins in development", () => {
      const middleware = createCorsMiddleware({ ...options, nodeEnv: "development" });
      const req = new Request("http://localhost", {
        headers: { Origin: "http://foo.com" },
      });
      const res = new Response("ok");

      const wrapped = middleware(req, res);
      expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBe("http://foo.com");
    });

    it("should allow specific origin in production", () => {
      const middleware = createCorsMiddleware({ ...options, nodeEnv: "production" });
      const req = new Request("http://localhost", {
        headers: { Origin: "https://example.com" },
      });
      const res = new Response("ok");

      const wrapped = middleware(req, res);
      expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");
    });

    it("should block disallowed origin in production", () => {
      const middleware = createCorsMiddleware({ ...options, nodeEnv: "production" });
      const req = new Request("http://localhost", {
        headers: { Origin: "https://evil.com" },
      });
      const res = new Response("ok");

      const wrapped = middleware(req, res);
      expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("should block all if no allowed origins configured in production", () => {
      const middleware = createCorsMiddleware({ ...options, nodeEnv: "production", allowedOrigins: [] });
      const req = new Request("http://localhost", {
        headers: { Origin: "https://example.com" },
      });
      const res = new Response("ok");

      const wrapped = middleware(req, res);
      expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("should set default CORS headers", () => {
        const middleware = createCorsMiddleware(options);
        const req = new Request("http://localhost");
        const res = new Response("ok");
        const wrapped = middleware(req, res);

        expect(wrapped.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, PUT, PATCH, DELETE, OPTIONS");
        expect(wrapped.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type, Authorization");
    });
  });

  describe("wrapResponse", () => {
    it("should wrap response with CORS headers", () => {
      const req = new Request("http://localhost", { headers: { Origin: "https://example.com" } });
      const res = new Response("ok");
      const wrapped = wrapResponse(res, req, { ...options, nodeEnv: "production" });

      expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");
    });
  });
});
