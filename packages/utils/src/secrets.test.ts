import { describe, it, expect, vi, afterEach } from "vitest";

import { resolveEnvironment } from "./secrets";

describe("resolveEnvironment", () => {
  const originalEnvironment = process.env;

  afterEach(() => {
    process.env = originalEnvironment;
    vi.restoreAllMocks();
  });

  it("should resolve from context if present", async () => {
    const context = {
      TEST_KEY: "context-value",
    };
    const result = await resolveEnvironment("TEST_KEY", context);
    expect(result).toBe("context-value");
  });

  it("should fallback to process.env if not in context", async () => {
    process.env.TEST_KEY = "env-value";
    const result = await resolveEnvironment("TEST_KEY", {});
    expect(result).toBe("env-value");
  });

  it("should prioritize context over process.env", async () => {
    process.env.TEST_KEY = "env-value";
    const context = {
      TEST_KEY: "context-value",
    };
    const result = await resolveEnvironment("TEST_KEY", context);
    expect(result).toBe("context-value");
  });

  it("should return undefined if not found in either", async () => {
    const result = await resolveEnvironment("NON_EXISTENT_KEY", {});
    expect(result).toBeUndefined();
  });

  it("should handle BoundSecret objects in context", async () => {
    const mockSecret = {
      get: vi.fn().mockResolvedValue("secret-value"),
    };
    const context = {
      SECRET_KEY: mockSecret,
    };

    // We need to cast unexpected types because the utility handles them but TS might complain in test setup
    const result = await resolveEnvironment(
      "SECRET_KEY",
      context as Record<string, unknown>,
    );
    expect(result).toBe("secret-value");
    expect(mockSecret.get).toHaveBeenCalled();
  });
});

import { resolveGoogleCredentials } from "./secrets";

describe("resolveGoogleCredentials", () => {
  const originalEnvironment = process.env;

  afterEach(() => {
    process.env = originalEnvironment;
    vi.restoreAllMocks();
  });

  it("should combine partial credentials", async () => {
    const context = {
      GOOGLE_APPLICATION_CREDENTIALS_PART_1: "part1",
      GOOGLE_APPLICATION_CREDENTIALS_PART_2: "part2",
      GOOGLE_APPLICATION_CREDENTIALS_PART_3: "part3",
    };
    const result = await resolveGoogleCredentials(context);
    expect(result).toBe("part1part2part3");
  });

  it("should fallback to full json if parts are missing", async () => {
    const context = {
      GOOGLE_SERVICE_ACCOUNT_JSON: "full-json",
    };
    const result = await resolveGoogleCredentials(context);
    expect(result).toBe("full-json");
  });

  it("should handle undefined env", async () => {
    const result = await resolveGoogleCredentials({});
    expect(result).toBeUndefined();
  });
});
