import baseConfig from "@learning-infra/config/eslint.config.js";

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
    ],
  },
];
