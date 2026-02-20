import { describe, expect, it } from "vitest";

import { mapOptional } from "./mapping";

describe("mapOptional", () => {
  it("should return null for undefined", () => {
    expect(mapOptional(undefined as unknown)).toBeNull();
  });

  it("should return null for null", () => {
    expect(mapOptional(null)).toBeNull();
  });

  it("should return the value for defined values", () => {
    expect(mapOptional("test")).toBe("test");
    expect(mapOptional(0)).toBe(0);
    expect(mapOptional(false)).toBe(false);
    expect(mapOptional({ key: "value" })).toEqual({ key: "value" });
  });
});
