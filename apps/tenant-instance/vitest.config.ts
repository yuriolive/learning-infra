import { vitestBaseConfig } from "@vendin/config/vitest.base.ts";
import tsconfigPaths from "vite-tsconfig-paths";
import { mergeConfig, defineConfig } from "vitest/config";

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      coverage: {
        exclude: ["src/scripts/"],
      },
    },
  }),
);
