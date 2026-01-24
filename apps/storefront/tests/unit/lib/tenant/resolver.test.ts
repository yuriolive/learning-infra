import { describe, expect, it } from "vitest";

import {
  extractSubdomainFromHostname,
  isLocalhost,
  shouldRedirectToMarketing,
} from "../../../../src/lib/tenant/resolver";

describe("Tenant Resolver", () => {
  describe("extractSubdomainFromHostname", () => {
    it("should extract valid subdomain from vendin.store", () => {
      expect(extractSubdomainFromHostname("acme.vendin.store")).toBe("acme");
      expect(extractSubdomainFromHostname("shop-1.vendin.store")).toBe(
        "shop-1",
      );
      expect(extractSubdomainFromHostname("my-cool-shop.vendin.store")).toBe(
        "my-cool-shop",
      );
    });

    it("should return null for root domain", () => {
      expect(extractSubdomainFromHostname("vendin.store")).toBe(null);
    });

    it("should return null for invalid subdomain format", () => {
      // Uppercase/underscore not allowed
      expect(extractSubdomainFromHostname("Invalid_Name.vendin.store")).toBe(
        null,
      );
      expect(extractSubdomainFromHostname("UPPERCASE.vendin.store")).toBe(null);

      // Starting or ending with hyphen
      expect(extractSubdomainFromHostname("-shop.vendin.store")).toBe(null);
      expect(extractSubdomainFromHostname("shop-.vendin.store")).toBe(null);

      // Empty subdomain
      expect(extractSubdomainFromHostname(".vendin.store")).toBe(null);
    });

    it("should enforce minimum length (3 chars)", () => {
      expect(extractSubdomainFromHostname("ab.vendin.store")).toBe(null); // Too short (2 chars)
      expect(extractSubdomainFromHostname("abc.vendin.store")).toBe("abc"); // Minimum valid (3 chars)
      expect(extractSubdomainFromHostname("a-b.vendin.store")).toBe("a-b"); // Valid with hyphen (3 chars)
    });

    it("should enforce maximum length (63 chars)", () => {
      const validMax = "a" + "b".repeat(61) + "c"; // 63 chars
      const tooLong = "a" + "b".repeat(62) + "c"; // 64 chars

      expect(extractSubdomainFromHostname(`${validMax}.vendin.store`)).toBe(
        validMax,
      );
      expect(extractSubdomainFromHostname(`${tooLong}.vendin.store`)).toBe(
        null,
      );
    });

    it("should return null for custom domains (MVP)", () => {
      expect(extractSubdomainFromHostname("shop.example.com")).toBe(null);
      expect(extractSubdomainFromHostname("www.google.com")).toBe(null);
    });
  });

  describe("shouldRedirectToMarketing", () => {
    it("should return true for root domain", () => {
      expect(shouldRedirectToMarketing("vendin.store")).toBe(true);
    });

    it("should return false for subdomain", () => {
      expect(shouldRedirectToMarketing("acme.vendin.store")).toBe(false);
      expect(shouldRedirectToMarketing("shop-1.vendin.store")).toBe(false);
    });
  });

  describe("isLocalhost", () => {
    it("should return true for localhost", () => {
      expect(isLocalhost("localhost:3000")).toBe(true);
      expect(isLocalhost("localhost")).toBe(true);
      expect(isLocalhost("127.0.0.1:3000")).toBe(true);
    });

    it("should return false for other domains", () => {
      expect(isLocalhost("vendin.store")).toBe(false);
      expect(isLocalhost("shop.vendin.store")).toBe(false);
    });
  });
});
