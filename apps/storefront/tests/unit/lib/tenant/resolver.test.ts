import { describe, expect, it } from "vitest";
import {
  extractSubdomainFromHostname,
  isLocalhost,
  shouldRedirectToMarketing,
} from "../../../../src/lib/tenant/resolver";

describe("Tenant Resolver", () => {
  describe("extractSubdomainFromHostname", () => {
    it("should extract subdomain from vendin.store", () => {
      expect(extractSubdomainFromHostname("acme.vendin.store")).toBe("acme");
      expect(extractSubdomainFromHostname("shop-1.vendin.store")).toBe("shop-1");
    });

    it("should return null for root domain", () => {
      expect(extractSubdomainFromHostname("vendin.store")).toBe(null);
    });

    it("should return null for invalid subdomain format", () => {
      expect(extractSubdomainFromHostname("Invalid_Name.vendin.store")).toBe(null); // Uppercase/underscore not allowed in regex
      expect(extractSubdomainFromHostname(".vendin.store")).toBe(null);
    });

    it("should return null for custom domains (MVP)", () => {
      expect(extractSubdomainFromHostname("shop.example.com")).toBe(null);
    });
  });

  describe("shouldRedirectToMarketing", () => {
    it("should return true for root domain", () => {
      expect(shouldRedirectToMarketing("vendin.store")).toBe(true);
    });

    it("should return false for subdomain", () => {
      expect(shouldRedirectToMarketing("acme.vendin.store")).toBe(false);
    });
  });

  describe("isLocalhost", () => {
    it("should return true for localhost", () => {
      expect(isLocalhost("localhost:3000")).toBe(true);
      expect(isLocalhost("localhost")).toBe(true);
    });

    it("should return false for other domains", () => {
      expect(isLocalhost("vendin.store")).toBe(false);
    });
  });
});
