import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    alias: {
      "@vendin/utils": path.resolve(__dirname, "../../packages/utils/src/index.ts"),
      "@vendin/logger": path.resolve(__dirname, "../../packages/logger/src/index.ts"),
    },
  },
});
