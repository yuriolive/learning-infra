import { type ViteUserConfig } from "vitest/config";

export const vitestBaseConfig: ViteUserConfig = {
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
