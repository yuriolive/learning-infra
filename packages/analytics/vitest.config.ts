import { mergeConfig, defineConfig } from "vitest/config";

import { vitestBaseConfig } from "../config/vitest.base.ts";

export default mergeConfig(vitestBaseConfig, defineConfig({}));
