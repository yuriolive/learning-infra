import baseConfig from "@learning-infra/config/eslint.config.js";

export default [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.eslint.json",
        },
      },
    },
  },
];
