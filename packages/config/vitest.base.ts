import type { UserConfig } from "vitest/config";

export const vitestBaseConfig: UserConfig = {
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: ["node_modules/", "dist/", "**/*.d.ts", "**/*.config.{ts,js}", ".agent/"],
    },
    environment: "node",
    globals: true,
    exclude: ["node_modules", "dist", ".medusa"],
  },
};

export default vitestBaseConfig;
