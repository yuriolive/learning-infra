import baseConfig from "@vendin/config/eslint.config.mjs";

export default [
  ...baseConfig,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/drizzle/**",
      "**/.next/**",
      "**/.open-next/**",
      "docs/examples/**",
      "**/pnpm-lock.yaml",
    ],
  },
];
