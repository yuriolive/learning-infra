import { vitestBaseConfig } from "@vendin/config/vitest.base.ts";
import { mergeConfig, defineConfig } from "vitest/config";

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
