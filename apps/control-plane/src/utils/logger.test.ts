import { describe, expect, it, vi, beforeEach } from "vitest";

import { createLogger, consoleLogger } from "./logger";

describe("createLogger", () => {
  const infoSpy = vi.spyOn(consoleLogger, "info").mockImplementation(() => {});
  const debugSpy = vi
    .spyOn(consoleLogger, "debug")
    .mockImplementation(() => {});
  const warnSpy = vi.spyOn(consoleLogger, "warn").mockImplementation(() => {});
  const errorSpy = vi
    .spyOn(consoleLogger, "error")
    .mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should filter logs based on logLevel", () => {
    const logger = createLogger({ logLevel: "warn" });

    logger.debug({ foo: "bar" }, "test debug");
    logger.info({ foo: "bar" }, "test info");
    logger.warn({ foo: "bar" }, "test warn");
    logger.error({ foo: "bar" }, "test error");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith({ foo: "bar" }, "test warn");
    expect(errorSpy).toHaveBeenCalledWith({ foo: "bar" }, "test error");
  });

  it("should use default 'debug' in development", () => {
    const logger = createLogger({ nodeEnv: "development" });

    logger.debug({ foo: "bar" }, "test debug");
    expect(debugSpy).toHaveBeenCalled();
  });

  it("should use default 'info' in production", () => {
    const logger = createLogger({ nodeEnv: "production" });

    logger.debug({ foo: "bar" }, "test debug");
    logger.info({ foo: "bar" }, "test info");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
  });

  it("should handle missing options gracefully", () => {
    const logger = createLogger();
    logger.info({ foo: "bar" }, "test info");
    expect(infoSpy).toHaveBeenCalled();
  });

  it("should handle invalid logLevel by falling back to default", () => {
    // Falls back to info (minLevel 1) if invalid
    const logger = createLogger({
      logLevel: "invalid" as string,
      nodeEnv: "production",
    });

    logger.debug({ foo: "bar" }, "test debug");
    expect(debugSpy).not.toHaveBeenCalled();

    logger.info({ foo: "bar" }, "test info");
    expect(infoSpy).toHaveBeenCalled();
  });
});
