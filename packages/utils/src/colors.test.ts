import { describe, expect, it } from "vitest";

import { generateHeroUIPalette, getContrastColor } from "./colors";

describe("Color Utilities", () => {
  describe("generateHeroUIPalette", () => {
    it("should generate 10 shades", () => {
      const palette = generateHeroUIPalette("#3b82f6"); // Blue 500
      expect(Object.keys(palette)).toHaveLength(10);
      expect(palette[500]).toBe("#3b82f6");
    });

    it("should generate lighter shades for 50-400", () => {
      const palette = generateHeroUIPalette("#3b82f6");
      // 50 should be very light
      expect(palette[50].toLowerCase()).toMatch(/^#[f]/);
    });

    it("should generate darker shades for 600-900", () => {
      const palette = generateHeroUIPalette("#3b82f6");
      // 900 should be darker than 500
      expect(palette[900]).not.toBe(palette[500]);
    });

    it("should handle invalid colors gracefully", () => {
      const palette = generateHeroUIPalette("not-a-color");
      expect(palette[500]).toBe("#6b7280"); // Fallback
    });
  });

  describe("getContrastColor", () => {
    it("should return white for dark colors", () => {
      expect(getContrastColor("#000000")).toBe("#ffffff");
      expect(getContrastColor("#1e3a8a")).toBe("#ffffff"); // Dark blue
    });

    it("should return black for light colors", () => {
      expect(getContrastColor("#ffffff")).toBe("#000000");
      expect(getContrastColor("#fef08a")).toBe("#000000"); // Light yellow
    });
  });
});
