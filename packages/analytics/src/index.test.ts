import { describe, it, expect, beforeEach, mock } from "bun:test";
import { PostHog } from "posthog-node";

import { initAnalytics, captureError, shutdown, __resetClient } from "./index";

void mock.module("posthog-node", () => {
  return {
    PostHog: mock(() => ({
      capture: mock(),
      shutdown: mock().mockResolvedValue(void 0),
    })),
  };
});

describe("analytics", () => {
  beforeEach(() => {
    __resetClient();
  });

  describe("initAnalytics", () => {
    it("should initialize PostHog client with provided API key and host", () => {
      const apiKey = "test-key";
      const host = "https://test.posthog.com";

      const client = initAnalytics(apiKey, { host });

      expect(PostHog).toHaveBeenCalledWith(
        apiKey,
        expect.objectContaining({ host }),
      );
      expect(client).toBeDefined();
    });

    it("should use environment variables if API key is not provided", () => {
      process.env.POSTHOG_API_KEY = "env-key";
      process.env.POSTHOG_HOST = "https://env.posthog.com";

      initAnalytics();

      expect(PostHog).toHaveBeenCalledWith(
        "env-key",
        expect.objectContaining({ host: "https://env.posthog.com" }),
      );

      delete process.env.POSTHOG_API_KEY;
      delete process.env.POSTHOG_HOST;
    });

    it("should throw error if API key is missing and not in test env", () => {
      const originalEnvironment = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      expect(() => initAnalytics()).toThrow(
        "PostHog API key is not configured. Analytics is disabled.",
      );

      // @ts-expect-error - resetting NODE_ENV to original value which might be undefined
      process.env.NODE_ENV = originalEnvironment;
    });
  });

  describe("captureError", () => {
    it("should capture error with correct properties", () => {
      const client = initAnalytics("test-key");
      const error = new Error("Test error");
      const context = { userId: "user-123" };

      captureError(error, context);

      expect(client?.capture).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "server_error",
          properties: expect.objectContaining({
            message: "Test error",
            userId: "user-123",
          }),
        }),
      );
    });

    it("should handle non-Error objects", () => {
      const client = initAnalytics("test-key");
      captureError("String error");

      expect(client?.capture).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            message: "String error",
          }),
        }),
      );
    });
  });

  describe("shutdown", () => {
    it("should call shutdown on the client", async () => {
      const client = initAnalytics("test-key");
      await shutdown();
      expect(client?.shutdown).toHaveBeenCalled();
    });
  });
});
