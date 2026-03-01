import { Redis } from "ioredis";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { TestEnvironment } from "../utils/test-containers";

describe("Cache Integration (Redis Testcontainers)", () => {
  let testEnvironment: TestEnvironment;
  let redisClient: Redis;

  beforeAll(async () => {
    testEnvironment = new TestEnvironment();
    const redis = await testEnvironment.startRedis();
    redisClient = new Redis(redis.url);
  }, 60_000); // 60s timeout for pulling redis image

  afterAll(async () => {
    redisClient.disconnect();
    await testEnvironment.stop();
  });

  afterEach(async () => {
    await redisClient.flushdb();
  });

  it("should record a cache hit and cache miss", async () => {
    // MISS: GET non_existent_key
    const missResult = await redisClient.get("test_key_miss");
    expect(missResult).toBeNull();

    // SET test_key_hit
    const setResult = await redisClient.set("test_key_hit", "test_value");
    expect(setResult).toBe("OK");

    // HIT: GET test_key_hit
    const hitResult = await redisClient.get("test_key_hit");
    expect(hitResult).toBe("test_value");
  });

  it("should respect cache expiry", async () => {
    // SET test_key_exp with PX 100 (expires in 100 milliseconds)
    await redisClient.set("test_key_exp", "exp_value", "PX", 100);

    // Verify it exists immediately
    let value = await redisClient.get("test_key_exp");
    expect(value).toBe("exp_value");

    // Wait 150ms
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Verify it has expired
    value = await redisClient.get("test_key_exp");
    expect(value).toBeNull();
  });
});
