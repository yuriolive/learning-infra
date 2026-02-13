import { describe, expect, it } from "vitest";

import { resolveHost } from "./http";

describe("resolveHost", () => {
  it("should prioritize x-forwarded-host header", () => {
    const headers = new Headers();
    headers.set("x-forwarded-host", "forwarded.com");
    headers.set("host", "original.com");

    expect(resolveHost(headers)).toBe("forwarded.com");
  });

  it("should fallback to host header if x-forwarded-host is missing", () => {
    const headers = new Headers();
    headers.set("host", "original.com");

    expect(resolveHost(headers)).toBe("original.com");
  });

  it("should return empty string if neither header is present", () => {
    const headers = new Headers();
    expect(resolveHost(headers)).toBe("");
  });

  it("should handle plain object with get method", () => {
    const headers = {
      get: (name: string) => {
        if (name === "x-forwarded-host") return "forwarded.com";
        return null;
      },
    };

    expect(resolveHost(headers)).toBe("forwarded.com");
  });

  it("should handle plain object with get method returning null", () => {
    const headers = {
      get: () => null,
    };

    expect(resolveHost(headers)).toBe("");
  });
});
