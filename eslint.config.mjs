//ts-check
import pluginJs from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import vitest from "@vitest/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";
import checkFile from "eslint-plugin-check-file";
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
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "check-file": checkFile,
    },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        {
          "src/components/**/*.{ts,tsx}": "KEBAB_CASE",
          "src/config/**/*.{ts,tsx}": "KEBAB_CASE",
          "src/features/**/*.{ts,tsx}": "KEBAB_CASE",
          "src/lib/**/*.{ts,tsx}": "KEBAB_CASE",
          "src/testing/**/*.{ts,tsx}": "KEBAB_CASE",
          "src/types/**/*.{ts,tsx}": "KEBAB_CASE",
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    plugins: {
      "check-file": checkFile,
    },
    rules: {
      "check-file/folder-naming-convention": ["error", { "src/app/**/": "NEXT_JS_APP_ROUTER_CASE" }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "check-file": checkFile,
    },
    rules: {
      "check-file/folder-naming-convention": [
        "error",
        {
          "src/components/**/": "KEBAB_CASE",
          "src/config/**/": "KEBAB_CASE",
          "src/features/**/": "KEBAB_CASE",
          "src/lib/**/": "KEBAB_CASE",
          "src/testing/**/": "KEBAB_CASE",
          "src/types/**/": "KEBAB_CASE",
        },
      ],
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
              from: ["./src/app", "./src/features"],
              target: [
                "./src/components",
                "./src/config",
                "./src/lib",
                "./src/types",
              ],
            },
            {
              except: ["./resume-analysis"],
              from: "./src/features",
              target: "./src/features/resume-analysis",
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
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "unicorn/prevent-abbreviations": "off",
    },
  },
  {
    files: [
      "src/config/**/*.{ts,tsx}",
      "src/features/resume-analysis/utils/**/*.{ts,tsx}",
      "src/lib/server/**/*.{ts,tsx}",
    ],
    rules: {
      "unicorn/prevent-abbreviations": "off",
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
      "coverage/*",
    ],
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
      "import/no-restricted-paths": "off",
      "sonarjs/no-nested-functions": "off",
      "unicorn/filename-case": "off",
      "unicorn/no-useless-undefined": "off",
      "unicorn/prevent-abbreviations": "off",
      "vitest/max-nested-describe": ["error", { max: 3 }],
    },
  },
  {
    ...playwright.configs["flat/recommended"],
    files: ["e2e/**/*.{ts,tsx}"],
  },
  {
    files: ["e2e/**/*.{ts,tsx}"],
    rules: {
      "import/named": "off",
    },
  },
];
