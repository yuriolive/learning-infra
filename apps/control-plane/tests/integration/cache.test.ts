import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestEnvironment } from "../utils/test-containers";

// Test Redis commands via raw TCP socket since we are avoiding npm module additions,
// but the test explicitly needs to ensure hit/miss/expiry against real Redis in Testcontainers.
import { createConnection } from "node:net";

function executeRedisCommand(port: number, host: string, command: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = createConnection({ port, host });

    // Redis RESP protocol: *<number of arguments>\r\n$<length of arg 1>\r\n<arg 1>\r\n...
    const resp = `*${command.length}\r\n` +
      command.map(arg => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`).join('');

    client.write(resp);

    let data = '';
    client.on('data', (chunk) => {
      data += chunk.toString();

      // Basic check to see if we got the full response
      // This is a naive RESP parser, fine for simple SET/GET tests
      if (data.includes('\r\n')) {
        client.end();
      }
    });

    client.on('end', () => {
      // Parse basic RESP replies
      if (data.startsWith('+')) {
        // Simple string
        resolve(data.substring(1, data.indexOf('\r\n')));
      } else if (data.startsWith('$')) {
        // Bulk string
        const lengthStr = data.substring(1, data.indexOf('\r\n'));
        const length = parseInt(lengthStr, 10);

        if (length === -1) {
          resolve("null"); // Null bulk string (miss)
        } else {
          const contentStart = data.indexOf('\r\n') + 2;
          resolve(data.substring(contentStart, contentStart + length));
        }
      } else if (data.startsWith(':')) {
        // Integer
        resolve(data.substring(1, data.indexOf('\r\n')));
      } else {
        resolve(data);
      }
    });

    client.on('error', reject);
  });
}

describe("Cache Integration (Redis Testcontainers)", () => {
  let testEnv: TestEnvironment;
  let redisUrl: URL;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    const redis = await testEnv.startRedis();
    // Redis URL format: redis://localhost:50324
    redisUrl = new URL(redis.url);
  }, 60000); // 60s timeout for pulling redis image

  afterAll(async () => {
    await testEnv.stop();
  });

  it("should record a cache hit and cache miss", async () => {
    const port = parseInt(redisUrl.port, 10);
    const host = redisUrl.hostname;

    // MISS: GET non_existent_key
    const missResult = await executeRedisCommand(port, host, ["GET", "test_key_miss"]);
    expect(missResult).toBe("null");

    // SET test_key_hit
    const setResult = await executeRedisCommand(port, host, ["SET", "test_key_hit", "test_value"]);
    expect(setResult).toBe("OK");

    // HIT: GET test_key_hit
    const hitResult = await executeRedisCommand(port, host, ["GET", "test_key_hit"]);
    expect(hitResult).toBe("test_value");
  });

  it("should respect cache expiry", async () => {
    const port = parseInt(redisUrl.port, 10);
    const host = redisUrl.hostname;

    // SET test_key_exp with PX 100 (expires in 100 milliseconds)
    await executeRedisCommand(port, host, ["SET", "test_key_exp", "exp_value", "PX", "100"]);

    // Verify it exists immediately
    let val = await executeRedisCommand(port, host, ["GET", "test_key_exp"]);
    expect(val).toBe("exp_value");

    // Wait 150ms
    await new Promise(resolve => setTimeout(resolve, 150));

    // Verify it has expired
    val = await executeRedisCommand(port, host, ["GET", "test_key_exp"]);
    expect(val).toBe("null");
  });
});
