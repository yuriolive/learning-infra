import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { UniversalCache } from "./index";

const { mockLogger, mockCreateLogger } = vi.hoisted(() => {
  const logger = { error: vi.fn() };
  return {
    mockLogger: logger,
    mockCreateLogger: vi.fn(() => logger),
  };
});

vi.mock("@vendin/logger", () => ({
  createCloudflareLogger: mockCreateLogger,
}));

describe("UniversalCache", () => {
  let cache: UniversalCache;
  const mockCfCache = {
    match: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new UniversalCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as unknown).caches;
  });

  describe("get", () => {
    it("should return null if key not found", async () => {
      const result = await cache.get("missing");
      expect(result).toBeNull();
    });

    it("should return value from LRU if present", async () => {
      await cache.set("key", "value");
      const result = await cache.get("key");
      expect(result).toBe("value");
    });

    it("should try Cloudflare cache if available", async () => {
      vi.stubGlobal("caches", { default: mockCfCache });
      mockCfCache.match.mockResolvedValue(
        new Response(JSON.stringify("cf-value")),
      );

      const result = await cache.get("cf-key");

      expect(mockCfCache.match).toHaveBeenCalled();
      const [request] = mockCfCache.match.mock.calls[0];
      expect(request).toBeInstanceOf(Request);
      expect(request.url).toContain("cf-key");

      expect(result).toBe("cf-value");
    });

    it("should fallback to LRU if Cloudflare cache misses", async () => {
      vi.stubGlobal("caches", { default: mockCfCache });
      mockCfCache.match.mockResolvedValue();

      await cache.set("lru-key", "lru-value");

      mockCfCache.match.mockClear();
      mockCfCache.match.mockResolvedValue();

      const result = await cache.get("lru-key");
      expect(result).toBe("lru-value");
    });

    it("should handle Cloudflare cache errors gracefully", async () => {
      vi.stubGlobal("caches", { default: mockCfCache });
      mockCfCache.match.mockRejectedValue(new Error("CF Error"));

      const result = await cache.get("error-key");

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should handle error when accessing caches global", async () => {
      Object.defineProperty(globalThis, "caches", {
        get: () => {
          throw new Error("Access denied");
        },
        configurable: true,
      });

      const result = await cache.get("key");
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("should set value in LRU", async () => {
      await cache.set("key", "value");
      expect(await cache.get("key")).toBe("value");
    });

    it("should set value in Cloudflare cache if available", async () => {
      vi.stubGlobal("caches", { default: mockCfCache });

      await cache.set("key", "value", { ttlSeconds: 120 });

      expect(mockCfCache.put).toHaveBeenCalled();
      const [request, response] = mockCfCache.put.mock.calls[0];

      expect(request).toBeInstanceOf(Request);
      expect(request.url).toContain("key");

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("Cache-Control")).toContain("s-maxage=120");
      expect(await response.json()).toBe("value");
    });

    it("should handle Cloudflare cache set errors gracefully", async () => {
      vi.stubGlobal("caches", { default: mockCfCache });
      mockCfCache.put.mockRejectedValue(new Error("CF Error"));

      await cache.set("key", "value");

      expect(mockLogger.error).toHaveBeenCalled();
      expect(await cache.get("key")).toBe("value");
    });
  });

  describe("delete", () => {
    it("should delete from LRU", async () => {
      await cache.set("key", "value");
      await cache.delete("key");
      expect(await cache.get("key")).toBeNull();
    });

    it("should delete from Cloudflare cache if available", async () => {
      vi.stubGlobal("caches", { default: mockCfCache });

      await cache.delete("key");

      expect(mockCfCache.delete).toHaveBeenCalled();
    });

    it("should handle Cloudflare cache delete errors gracefully", async () => {
      vi.stubGlobal("caches", { default: mockCfCache });
      mockCfCache.delete.mockRejectedValue(new Error("CF Error"));

      await cache.delete("key");

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("Initialization", () => {
    it("should default to development env if NODE_ENV is missing", async () => {
      vi.resetModules();
      const originalEnvironment = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      await import("./index");

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({ nodeEnv: "development" }),
      );

      process.env.NODE_ENV = originalEnvironment;
    });
  });
});
