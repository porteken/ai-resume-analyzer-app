//ts-check
import pluginJs from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import vitest from "@vitest/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import perfectionist from "eslint-plugin-perfectionist";
import playwright from "eslint-plugin-playwright";
import pluginPromise from "eslint-plugin-promise";
import pluginReact from "eslint-plugin-react";
import sonarjs from "eslint-plugin-sonarjs";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  pluginJs.configs.recommended,
  sonarjs.configs.recommended,
  importPlugin.flatConfigs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  pluginPromise.configs["flat/recommended"],
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  eslintConfigPrettier,
  eslintPluginUnicorn.configs.recommended,
  perfectionist.configs["recommended-natural"],
  {
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              from: "./src/app",
              target: "./src/features",
            },
            {
              from: ["./src/features", "./src/app"],
              target: [
                "./src/components",
                "./src/hooks",
                "./src/lib",
                "./src/types",
                "./src/utils",
                "./src/config",
                "./src/stores",
              ],
            },
            {
              from: ["./src/components", "./src/hooks", "./src/utils"],
              target: ["./src/features", "./src/app"],
            },
          ],
        },
      ],
      "import/no-unresolved": "off",
      "react/jsx-uses-react": "error",
      "react/prop-types": "off",
      "unicorn/better-regex": "warn",
      "unicorn/no-null": "off",
      "unicorn/prefer-global-this": "off",
    },
  },
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    ignores: [
      ".next/*",
      "next-env.d.ts",
      "src/__tests__/utils/*",
      "coverage/*",
    ],
  },
  {
    files: ["src/__tests__/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": "off",
    },
  },
  {
    files: [
      "**/__tests__/**/*.{ts,tsx}",
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
    ],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/max-nested-describe": ["error", { max: 3 }],
    },
  },
  {
    ...playwright.configs["flat/recommended"],
    files: ["tests/**"],
  },
];
