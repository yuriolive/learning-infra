import { createCloudflareLogger } from "@vendin/logger";
import { LRUCache } from "lru-cache";

const logger = createCloudflareLogger({
  nodeEnv: process.env.NODE_ENV || "development",
});

export interface CacheOptions {
  ttlSeconds?: number;
}

export class UniversalCache {
  // @ts-expect-error unknown does not satisfy {} constraint in lru-cache v11
  private lru: LRUCache<string, unknown>;

  constructor() {
    // @ts-expect-error unknown does not satisfy {} constraint in lru-cache v11
    this.lru = new LRUCache<string, unknown>({
      max: 1000,
      ttl: 1000 * 60 * 5, // 5 minutes default fallback
    });
  }

  /**
   * Helper to get Cloudflare Cache API if available.
   */
  private getCloudflareCache(): Cache | null {
    try {
      // In Cloudflare Workers/Edge Runtime, caches.default is available
      if (typeof caches === "undefined") {
        return null;
      }
      return (caches as unknown as { default: Cache }).default;
    } catch {
      return null;
    }
  }

  /**
   * Gets a value from the cache.
   * Checks Cloudflare Cache API first, then falls back to in-memory LRU.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cfCache = this.getCloudflareCache();
      if (cfCache) {
        const cacheKey = new Request(
          `https://universal-cache.internal/${encodeURIComponent(key)}`,
        );
        const response = await cfCache.match(cacheKey);
        if (response) {
          return (await response.json()) as T;
        }
      }
    } catch (error) {
      logger.error({ error, key }, "Cloudflare Cache Get Error");
    }

    return (this.lru.get(key) as T) || null;
  }

  /**
   * Sets a value in the cache.
   * Stores in both Cloudflare Cache API (if available) and in-memory LRU.
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<void> {
    const { ttlSeconds = 60 } = options;

    try {
      const cfCache = this.getCloudflareCache();
      if (cfCache) {
        const cacheKey = new Request(
          `https://universal-cache.internal/${encodeURIComponent(key)}`,
        );
        const response = new Response(JSON.stringify(value), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, s-maxage=${ttlSeconds}`,
          },
        });
        await cfCache.put(cacheKey, response);
      }
    } catch (error) {
      logger.error({ error, key }, "Cloudflare Cache Set Error");
    }

    this.lru.set(key, value, { ttl: ttlSeconds * 1000 });
  }

  /**
   * Deletes a value from the cache.
   */
  async delete(key: string): Promise<void> {
    try {
      const cfCache = this.getCloudflareCache();
      if (cfCache) {
        const cacheKey = new Request(
          `https://universal-cache.internal/${encodeURIComponent(key)}`,
        );
        await cfCache.delete(cacheKey);
      }
    } catch (error) {
      logger.error({ error, key }, "Cloudflare Cache Delete Error");
    }

    this.lru.delete(key);
  }
}

export const cache = new UniversalCache();
