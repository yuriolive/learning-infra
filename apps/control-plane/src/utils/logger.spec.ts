import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";

import { consoleLogger } from "./logger";

describe("consoleLogger", () => {
  let logSpy: MockInstance;
  let errorSpy: MockInstance;

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
    const object = { foo: "bar" };
    consoleLogger.info(object, "test message");

    expect(logSpy).toHaveBeenCalledTimes(1);
    const callArguments = logSpy.mock.calls[0]?.[0];
    if (typeof callArguments !== "string") throw new Error("Expected string");
    const parsed = JSON.parse(callArguments);

    expect(parsed).toEqual(
      expect.objectContaining({
        level: "info",
        message: "test message",
        foo: "bar",
      }),
    );
  });

  it("should log error as JSON string", () => {
    consoleLogger.error({ error: "fail" }, "oops");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const callArguments = errorSpy.mock.calls[0]?.[0];
    if (typeof callArguments !== "string") throw new Error("Expected string");
    const parsed = JSON.parse(callArguments);
    expect(parsed.level).toBe("error");
  });

  it("should handle circular references", () => {
    const object: any = { name: "circular" };
    object.self = object;

    consoleLogger.info(object, "circular test");

    expect(logSpy).toHaveBeenCalledTimes(1);
    const callArguments = logSpy.mock.calls[0]?.[0];
    if (typeof callArguments !== "string") throw new Error("Expected string");

    const parsed = JSON.parse(callArguments);
    expect(parsed.name).toBe("circular");
    expect(parsed.self).toBeDefined();
    expect((parsed.self as any).name).toBe("circular");
    expect((parsed.self as any).self).toBeUndefined();
  });

  it("should serialize Error objects correctly", () => {
    const error = new Error("Test Error");
    error.stack = "Error: Test Error\n    at test";
    (error as any).code = "ERR_TEST";

    consoleLogger.error(error, "error occurred");

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const callArguments = errorSpy.mock.calls[0]?.[0];
    if (typeof callArguments !== "string") throw new Error("Expected string");
    const parsed = JSON.parse(callArguments);

    expect(parsed.message).toBe("Test Error");
    expect(parsed.name).toBe("Error");
    expect(parsed.stack).toBe("Error: Test Error\n    at test");
    expect((parsed as any).code).toBe("ERR_TEST");
  });

  it("should handle nested Error objects", () => {
    const error = new Error("Nested");
    const wrapper = { err: error };

    consoleLogger.error(wrapper, "wrapper");

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const callArguments = errorSpy.mock.calls[0]?.[0];
    if (typeof callArguments !== "string") throw new Error("Expected string");
    const parsed = JSON.parse(callArguments);

    expect(parsed.err).toBeDefined();
    expect(parsed.err.message).toBe("Nested");
    expect(parsed.err.name).toBe("Error");
  });
});
