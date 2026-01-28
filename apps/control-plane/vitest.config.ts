import { vitestBaseConfig } from "@vendin/config/vitest.base.ts";
import tsconfigPaths from "vite-tsconfig-paths";
import { mergeConfig, defineConfig } from "vitest/config";

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      coverage: {
        exclude: ["src/index.ts", "tests/"],
      },
      env: {
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/postgres",
      },
      include: [
        "src/**/*.{test,spec}.{ts,js}",
        "tests/**/*.{test,spec}.{ts,js}",
      ],
    },
  }),
);
