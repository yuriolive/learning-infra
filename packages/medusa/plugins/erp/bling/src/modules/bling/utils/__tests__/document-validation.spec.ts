import { describe, it, expect } from "vitest";
import { isValidCPF, isValidCNPJ, sanitizeDocument } from "../document-validation.js";

describe("Document Validation", () => {
  describe("sanitizeDocument", () => {
    it("should remove non-digits", () => {
      expect(sanitizeDocument("123.456.789-00")).toBe("12345678900");
      expect(sanitizeDocument("abc")).toBe("");
      expect(sanitizeDocument("")).toBe("");
    });
  });

  describe("isValidCPF", () => {
    it("should validate valid CPFs", () => {
      // Generated valid CPFs for testing
      expect(isValidCPF("11144477735")).toBe(true);
      expect(isValidCPF("12345678909")).toBe(true);
    });

    it("should invalidate invalid CPFs", () => {
      expect(isValidCPF("12345678900")).toBe(false);
      expect(isValidCPF("11111111111")).toBe(false); // Repeated digits
      expect(isValidCPF("123")).toBe(false); // Wrong length
    });
  });

  describe("isValidCNPJ", () => {
    it("should validate valid CNPJs", () => {
      // Generated valid CNPJs
      expect(isValidCNPJ("11444777000161")).toBe(true);
      expect(isValidCNPJ("07526557000100")).toBe(true);
    });

    it("should invalidate invalid CNPJs", () => {
      expect(isValidCNPJ("11444777000100")).toBe(false);
      expect(isValidCNPJ("11111111111111")).toBe(false); // Repeated digits
      expect(isValidCNPJ("123")).toBe(false); // Wrong length
    });
  });
});
