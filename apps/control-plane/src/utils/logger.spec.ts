import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { consoleLogger } from "./logger";

describe("consoleLogger", () => {
  let logSpy: ReturnType<typeof vi.fn>;
  let errorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log info as JSON string", () => {
    const obj = { foo: "bar" };
    consoleLogger.info(obj, "test message");

    expect(logSpy).toHaveBeenCalledTimes(1);
    const callArgs = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(callArgs);

    expect(parsed).toEqual(expect.objectContaining({
      level: "info",
      message: "test message",
      foo: "bar",
    }));
  });

  it("should log error as JSON string", () => {
    consoleLogger.error({ error: "fail" }, "oops");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(parsed.level).toBe("error");
  });

  it("should handle circular references", () => {
    const obj: any = { name: "circular" };
    obj.self = obj;

    consoleLogger.info(obj, "circular test");

    expect(logSpy).toHaveBeenCalledTimes(1);
    const callArgs = logSpy.mock.calls[0][0];
    expect(typeof callArgs).toBe("string");

    const parsed = JSON.parse(callArgs);
    expect(parsed.name).toBe("circular");
    // Since formatLog spreads the object into a new wrapper, the cycle is slightly shifted.
    // wrapper.self points to original obj.
    // serialization of obj encounters obj again and terminates.
    // So parsed.self exists but parsed.self.self is undefined.
    expect(parsed.self).toBeDefined();
    expect(parsed.self.name).toBe("circular");
    expect(parsed.self.self).toBeUndefined();
  });

  it("should serialize Error objects correctly", () => {
    const error = new Error("Test Error");
    error.stack = "Error: Test Error\n    at test";
    (error as any).code = "ERR_TEST";

    consoleLogger.error(error, "error occurred");

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);

    expect(parsed.message).toBe("Test Error");
    expect(parsed.name).toBe("Error");
    expect(parsed.stack).toBe("Error: Test Error\n    at test");
    expect(parsed.code).toBe("ERR_TEST");
  });

  it("should handle nested Error objects", () => {
    const error = new Error("Nested");
    const wrapper = { err: error };

    consoleLogger.error(wrapper, "wrapper");

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);

    expect(parsed.err).toBeDefined();
    expect(parsed.err.message).toBe("Nested");
    expect(parsed.err.name).toBe("Error");
  });
});
