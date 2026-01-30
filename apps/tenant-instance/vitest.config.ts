import tsconfigPaths from "vite-tsconfig-paths";
import { mergeConfig, defineConfig } from "vitest/config";

import { vitestBaseConfig } from "../../packages/config/vitest.base.ts";

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
