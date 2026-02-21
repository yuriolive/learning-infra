import { describe, it, expect } from "vitest";
import { convertToDecimal, convertFromDecimal, sanitizeIdentificationNumber } from "../index";
import { mapMercadoPagoStatus } from "../status-mapper";
import { verifyMercadoPagoSignature } from "../webhook";

describe("MercadoPago Utils", () => {
  describe("convertToDecimal", () => {
    it("should convert number", () => {
      expect(convertToDecimal(1000)).toBe(10);
    });

    it("should convert string", () => {
      expect(convertToDecimal("1000")).toBe(10);
    });

    it("should convert BigNumber-like object", () => {
      expect(convertToDecimal({ toString: () => "1000" } as any)).toBe(10);
    });
  });

  describe("convertFromDecimal", () => {
    it("should convert to integer", () => {
      expect(convertFromDecimal(10)).toBe(1000);
    });
  });

  describe("sanitizeIdentificationNumber", () => {
    it("should remove dots and dashes", () => {
      expect(sanitizeIdentificationNumber("123.456.789-00")).toBe("12345678900");
    });
  });

  describe("mapMercadoPagoStatus", () => {
    it("should map approved", () => {
      expect(mapMercadoPagoStatus("approved")).toBe("authorized");
    });

    it("should map pending/in_process", () => {
      expect(mapMercadoPagoStatus("pending")).toBe("pending");
      expect(mapMercadoPagoStatus("in_process")).toBe("pending");
    });

    it("should map rejected/cancelled/refunded/charged_back", () => {
      expect(mapMercadoPagoStatus("rejected")).toBe("canceled");
      expect(mapMercadoPagoStatus("cancelled")).toBe("canceled");
      expect(mapMercadoPagoStatus("refunded")).toBe("canceled");
      expect(mapMercadoPagoStatus("charged_back")).toBe("canceled");
    });

    it("should default to pending", () => {
      expect(mapMercadoPagoStatus("unknown")).toBe("pending");
    });
  });

  describe("verifyMercadoPagoSignature", () => {
    const secret = "secret";

    it("should return false if missing signature header or secret", () => {
      expect(verifyMercadoPagoSignature({}, {}, secret)).toBe(false);
      //  test
      expect(verifyMercadoPagoSignature({"x-signature": "foo"}, {}, "")).toBe(false);
    });

    it("should return false if malformed signature header", () => {
      expect(verifyMercadoPagoSignature({"x-signature": "invalid"}, {}, secret)).toBe(false);
      expect(verifyMercadoPagoSignature({"x-signature": "ts=123"}, {}, secret)).toBe(false);
      expect(verifyMercadoPagoSignature({"x-signature": "v1=abc"}, {}, secret)).toBe(false);
    });

    it("should return false if missing ts or v1 values", () => {
      expect(verifyMercadoPagoSignature({"x-signature": "ts=,v1=abc"}, {}, secret)).toBe(false);
      expect(verifyMercadoPagoSignature({"x-signature": "ts=123,v1="}, {}, secret)).toBe(false);
    });

    // v1 is hex, sha256 hex is 64 chars.
    // If we provide v1 with wrong length, timingSafeEqual throws?
    // "RangeError: Input buffers must have the same byte length"
    // The code checks length before timingSafeEqual.

    it("should return false if hash length mismatch", () => {
       const headers = {
         "x-signature": "ts=123,v1=1234567890", // dummy v1
         "x-request-id": "req",
       };
       const query = { "data.id": "123" };
       expect(verifyMercadoPagoSignature(headers, query, secret)).toBe(false);
    });

    it("should return false if invalid signature", () => {
       // Create valid length but wrong hash
       const headers = {
         "x-signature": "ts=123,v1=" + "a".repeat(64), // sha256 is 64 hex chars
         "x-request-id": "req",
       };
       const query = { "data.id": "123" };
       expect(verifyMercadoPagoSignature(headers, query, secret)).toBe(false);
    });
  });
});
