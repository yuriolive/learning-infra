import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import perfectionist from "eslint-plugin-perfectionist";
import prettier from "eslint-plugin-prettier";
import promise from "eslint-plugin-promise";
import security from "eslint-plugin-security";
import tsdoc from "eslint-plugin-tsdoc";
import unicorn from "eslint-plugin-unicorn";
import vitest from "eslint-plugin-vitest";

export default [
  // Ignore patterns
  {
    ignores: [
      ".agent/",
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      "**/*.d.ts",
      "scripts/",
      "docs/examples/**",
    ],
  },

  // Base ESLint recommended rules
  js.configs.recommended,

  // TypeScript configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        fetch: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
      },
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        project: "./tsconfig.eslint.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      perfectionist,
      tsdoc,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true, varsIgnorePattern: "^_" },
      ],
      "no-undef": "off",
      "tsdoc/syntax": "warn",
    },
  },

  // Node.js configuration
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        console: "readonly",
        process: "readonly",
      },
      sourceType: "module",
    },
    plugins: {
      import: importPlugin,
      perfectionist,
      prettier,
      promise,
      security,
      unicorn,
    },
    rules: {
      "comma-dangle": ["error", "always-multiline"],
      complexity: ["warn", 10],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "import/no-cycle": "warn",
      "import/no-unresolved": "warn",
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],
      "no-console": "error",
      "no-debugger": "error",
      "no-return-await": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "perfectionist/sort-imports": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
          newlinesBetween: "always",
          order: "asc",
          sortSideEffects: true,
          type: "alphabetical",
        },
      ],
      "prefer-const": "error",
      "prettier/prettier": "error",
      quotes: ["error", "double", { avoidEscape: true }],
      "require-await": "warn",
      semi: ["error", "always"],
      ...promise.configs.recommended.rules,
      ...security.configs.recommended.rules,
      ...unicorn.configs.recommended.rules,
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
      "unicorn/no-array-for-each": "off",
      "unicorn/no-null": "off",
      "unicorn/prefer-node-protocol": "error",
    },
    settings: {
      "import/core-modules": ["bun", "node:crypto", "node:path", "node:url"],
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },

  // Test files override
  {
    files: ["**/tests/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      globals: {
        afterAll: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        test: "readonly",
        vi: "readonly",
        vitest: "readonly",
      },
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        project: "./tsconfig.eslint.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      vitest,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...vitest.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "off",
      "max-lines-per-function": "off",
      "no-console": "off",
    },
  },

  // Config files override
  {
    files: ["**/*.config.{js,ts}", "vitest.config.ts"],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "import/no-deprecated": "off",
    },
  },

  // Prettier config (must be last)
  prettierConfig,
];
