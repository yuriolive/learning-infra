import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  consoleLogger,
  createCloudflareLogger,
} from "./logger-cloudflare-factory";

vi.mock("./cloudflare-logger", () => ({
  consoleLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("createCloudflareLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a logger with working methods", () => {
    const logger = createCloudflareLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("should log info when priority is met", () => {
    const logger = createCloudflareLogger({ logLevel: "info" });
    logger.info({ foo: "bar" }, "test message");
    expect(consoleLogger.info).toHaveBeenCalledWith(
      { foo: "bar" },
      "test message",
    );
  });

  it("should not log debug when level is info", () => {
    const logger = createCloudflareLogger({ logLevel: "info" });
    logger.debug({ foo: "bar" }, "test message");
    expect(consoleLogger.debug).not.toHaveBeenCalled();
  });

  it("should log debug when level is debug", () => {
    const logger = createCloudflareLogger({ logLevel: "debug" });
    logger.debug({ foo: "bar" }, "test message");
    expect(consoleLogger.debug).toHaveBeenCalledWith(
      { foo: "bar" },
      "test message",
    );
  });

  it("should use production defaults (info)", () => {
    const logger = createCloudflareLogger({ nodeEnv: "production" });
    logger.debug({ foo: "bar" }, "test message");
    expect(consoleLogger.debug).not.toHaveBeenCalled();
    logger.info({ foo: "bar" }, "test message");
    expect(consoleLogger.info).toHaveBeenCalled();
  });

  it("should use development defaults (debug)", () => {
    const logger = createCloudflareLogger({ nodeEnv: "development" });
    logger.debug({ foo: "bar" }, "test message");
    expect(consoleLogger.debug).toHaveBeenCalled();
  });

  it("should log errors regardless of min level being info", () => {
    const logger = createCloudflareLogger({ logLevel: "info" });
    logger.error({ err: "fatal" }, "error message");
    expect(consoleLogger.error).toHaveBeenCalledWith(
      { err: "fatal" },
      "error message",
    );
  });

  it("should respect warn level", () => {
    const logger = createCloudflareLogger({ logLevel: "warn" });
    logger.info({ foo: "bar" }, "should not log");
    expect(consoleLogger.info).not.toHaveBeenCalled();
    logger.warn({ foo: "bar" }, "should log");
    expect(consoleLogger.warn).toHaveBeenCalled();
  });

  it("should handle invalid log level by falling back to default", () => {
    // @ts-expect-error Testing invalid log level
    const logger = createCloudflareLogger({ logLevel: "invalid" });
    // Default in test env (dev) is debug.
    // So debug should log.
    logger.debug({ foo: "bar" }, "test message");
    expect(consoleLogger.debug).toHaveBeenCalled();
  });

  it("should not log info when level is error", () => {
    const logger = createCloudflareLogger({ logLevel: "error" });
    logger.info({ foo: "bar" }, "should not log");
    expect(consoleLogger.info).not.toHaveBeenCalled();
    logger.error({ foo: "bar" }, "should log");
    expect(consoleLogger.error).toHaveBeenCalled();
  });

  it("should not log warn when level is error", () => {
    const logger = createCloudflareLogger({ logLevel: "error" });
    logger.warn({ foo: "bar" }, "should not log");
    expect(consoleLogger.warn).not.toHaveBeenCalled();
    logger.error({ foo: "bar" }, "should log");
    expect(consoleLogger.error).toHaveBeenCalled();
  });
});
