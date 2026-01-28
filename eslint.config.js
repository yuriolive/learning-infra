import baseConfig from "@vendin/config/eslint.config.js";

export default [
  ...baseConfig,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/.bun/**",
      "**/drizzle/**",
      "**/.next/**",
      "**/.open-next/**",
      "docs/examples/**",
    ],
  },
];
