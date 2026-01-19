import path from "node:path";
import { fileURLToPath } from "node:url";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      exclude: [
        ".cursor/",
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.{ts,js}",
        "src/index.ts",
        "tests/",
      ],
      provider: "v8",
      reporter: ["text", "lcov", "html"],
    },
    environment: "node",
    exclude: ["node_modules", "dist"],
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,js}", "tests/**/*.{test,spec}.{ts,js}"],
  },
});
