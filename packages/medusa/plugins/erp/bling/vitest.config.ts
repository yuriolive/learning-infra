import { mergeConfig, defineConfig } from "vitest/config";

import { vitestBaseConfig } from "../../../../config/vitest.base.ts";

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/api/index.ts"],
      },
    },
  }),
);
