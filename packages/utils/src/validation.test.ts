import { describe, expect, it } from "vitest";

import { isSubdomain, subdomainSchema } from "./validation";

describe("validation", () => {
  describe("isSubdomain", () => {
    it("should return true for valid subdomains", () => {
      expect(isSubdomain("myshop")).toBe(true);
      expect(isSubdomain("shop-123")).toBe(true);
      expect(isSubdomain("valid.subdomain")).toBe(true); // FQDN allows dots usually
    });

    it("should return false for invalid subdomains", () => {
      expect(isSubdomain("invalid_subdomain")).toBe(false); // underscores disallowed by default FQDN unless allow_underscores: true (which is false here)
      expect(isSubdomain("invalid space")).toBe(false);
      expect(isSubdomain("-start-dash")).toBe(false);
      expect(isSubdomain("end-dash-")).toBe(false);
    });
  });

  describe("subdomainSchema", () => {
    it("should parse valid subdomains", () => {
      expect(subdomainSchema.parse("myshop")).toBe("myshop");
    });

    it("should throw for invalid subdomains", () => {
      expect(() => subdomainSchema.parse("invalid_subdomain")).toThrow();
    });
  });
});
