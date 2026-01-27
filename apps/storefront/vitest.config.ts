import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "dist/**",
        "node_modules/**",
        "**/*.config.{ts,js,mjs}",
        ".next/**",
      ],
    },
  },
});
