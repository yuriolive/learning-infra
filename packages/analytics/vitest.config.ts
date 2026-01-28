import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "dist/**",
        "node_modules/**",
        "**/*.d.ts",
        "**/*.config.{ts,js}",
      ],
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    exclude: ["dist/**", "node_modules/**"],
  },
});
