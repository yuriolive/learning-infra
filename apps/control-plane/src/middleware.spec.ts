import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockLogger } from "../tests/utils/test-utilities";

import {
  type MiddlewareOptions,
  createAuthMiddleware,
  createCorsMiddleware,
  wrapResponse,
} from "./middleware";

import type { Logger } from "./utils/logger";

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
      const request = new Request("http://localhost", {
        headers: { Authorization: "Bearer secret-key" },
      });
      const result = middleware(request);
      expect(result).toBeNull();
    });

    it("should fail if adminApiKey is not configured", async () => {
      const middleware = createAuthMiddleware({
        ...options,
        adminApiKey: undefined,
      });
      const request = new Request("http://localhost");
      const result = middleware(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);
      const body = await result?.json();
      expect(body.message).toBe("Server authentication check not configured");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should fail if Authorization header is missing", async () => {
      const middleware = createAuthMiddleware(options);
      const request = new Request("http://localhost");
      const result = middleware(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("should fail if Authorization header is invalid format", async () => {
      const middleware = createAuthMiddleware(options);
      const request = new Request("http://localhost", {
        headers: { Authorization: "Basic key" },
      });
      const result = middleware(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("should fail if token does not match", async () => {
      const middleware = createAuthMiddleware(options);
      const request = new Request("http://localhost", {
        headers: { Authorization: "Bearer wrong-key" },
      });
      const result = middleware(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    // Testing areEqual timing attack prevention logic implicitly:
    // Ensure partial matches fail.
    it("should fail on partial match token", async () => {
      const middleware = createAuthMiddleware(options);
      const request = new Request("http://localhost", {
        headers: { Authorization: "Bearer secret" }, // shorter
      });
      const result = middleware(request);
      expect(result?.status).toBe(401);
    });
  });

  describe("createCorsMiddleware", () => {
    it("should allow all origins in development", () => {
      const middleware = createCorsMiddleware({
        ...options,
        nodeEnv: "development",
      });
      const request = new Request("http://localhost", {
        headers: { Origin: "http://foo.com" },
      });
      const response = new Response("ok");

      const wrapped = middleware(request, response);
      expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://foo.com",
      );
    });

    it("should allow specific origin in production", () => {
      const middleware = createCorsMiddleware({
        ...options,
        nodeEnv: "production",
      });
      const request = new Request("http://localhost", {
        headers: { Origin: "https://example.com" },
      });
      const response = new Response("ok");

      const wrapped = middleware(request, response);
      expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://example.com",
      );
    });

    it("should block disallowed origin in production", () => {
      const middleware = createCorsMiddleware({
        ...options,
        nodeEnv: "production",
      });
      const request = new Request("http://localhost", {
        headers: { Origin: "https://evil.com" },
      });
      const response = new Response("ok");

      const wrapped = middleware(request, response);
      expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("should block all if no allowed origins configured in production", () => {
      const middleware = createCorsMiddleware({
        ...options,
        nodeEnv: "production",
        allowedOrigins: [],
      });
      const request = new Request("http://localhost", {
        headers: { Origin: "https://example.com" },
      });
      const response = new Response("ok");

      const wrapped = middleware(request, response);
      expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("should set default CORS headers", () => {
      const middleware = createCorsMiddleware(options);
      const request = new Request("http://localhost");
      const response = new Response("ok");
      const wrapped = middleware(request, response);

      expect(wrapped.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      expect(wrapped.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization",
      );
    });
  });

  describe("wrapResponse", () => {
    it("should wrap response with CORS headers", () => {
      const request = new Request("http://localhost", {
        headers: { Origin: "https://example.com" },
      });
      const response = new Response("ok");
      const wrapped = wrapResponse(response, request, {
        ...options,
        nodeEnv: "production",
      });

      expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://example.com",
      );
    });
  });
});
