import { afterEach, describe, expect, it, vi } from "vitest";

import { consoleLogger } from "./cloudflare-logger";

describe("consoleLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should format object logs correctly", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleLogger.info({ foo: "bar" }, "test message");

    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify({ level: "info", message: "test message", foo: "bar" }),
    );
  });

  it("should format string-only logs correctly", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogger.error("test error message");

    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify({ level: "error", message: "test error message" }),
    );
  });

  it("should format object logs without message correctly", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogger.warn({ warning: "test" });

    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify({ level: "warn", warning: "test" }),
    );
  });

  it("should format debug logs correctly", () => {
    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    consoleLogger.debug("test debug message");

    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify({ level: "debug", message: "test debug message" }),
    );
  });

  it("should handle circular references safely", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const circular: unknown = { name: "circular" };
    circular.self = circular;

    consoleLogger.info(circular, "circular test");

    expect(consoleSpy).toHaveBeenCalled();
    const callArguments = consoleSpy.mock.calls[0][0];

    expect(callArguments).toContain("circular test");
    expect(callArguments).toContain('"name":"circular"');
  });

  it("should serialize Error objects correctly when passed as property", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Inner Error");

    consoleLogger.error({ err: error }, "Wrapper message");

    expect(consoleSpy).toHaveBeenCalled();
    const callArguments = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(callArguments);

    expect(parsed).toHaveProperty("message", "Wrapper message");
    expect(parsed.err).toBeDefined();
    expect(parsed.err.message).toBe("Inner Error");
    expect(parsed.err.name).toBe("Error");
    expect(parsed.err.stack).toBeDefined();
  });
});
