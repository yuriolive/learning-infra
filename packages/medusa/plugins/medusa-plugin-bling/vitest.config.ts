import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "dist/",
        "**/*.d.ts",
        "**/*.config.{ts,js}",
        "src/api/index.ts",
      ],
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    environment: "node",
    exclude: ["node_modules", "dist", ".medusa"],
    globals: true,
  },
});
