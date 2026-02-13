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
});
