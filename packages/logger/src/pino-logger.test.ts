import pino from "pino";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

import { createLogger } from "./pino-logger";

// Mock pino
vi.mock("pino", () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe("createLogger", () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it("should create a logger with default development settings", () => {
    process.env.NODE_ENV = "development";
    createLogger();

    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "debug",
        transport: expect.objectContaining({
          target: "pino-pretty",
        }),
      }),
    );
  });

  it("should create a logger with production settings", () => {
    createLogger({ nodeEnv: "production" });

    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
      }),
    );

    // Check that transport is NOT present
    const callArguments = (pino as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArguments).not.toHaveProperty("transport");
  });

  it("should allow overriding log level", () => {
    createLogger({ logLevel: "error" });

    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "error",
      }),
    );
  });

  it("should fallback to process.env.NODE_ENV", () => {
    process.env.NODE_ENV = "production";
    createLogger();

    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
      }),
    );

    const callArguments = (pino as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArguments).not.toHaveProperty("transport");
  });
});
