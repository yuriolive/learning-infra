import baseConfig from "@vendin/config/eslint.config.js";

export default [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
      },
    },
  },
];
