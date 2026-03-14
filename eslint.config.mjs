// @ts-check
import pluginJs from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import nextVitals from "eslint-config-next/core-web-vitals";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import { configs as perfectionistConfigs } from "eslint-plugin-perfectionist";
import playwright from "eslint-plugin-playwright";
import pluginPromise from "eslint-plugin-promise";
import pluginReact from "eslint-plugin-react";
import sonarjs from "eslint-plugin-sonarjs";
import tailwind from "eslint-plugin-tailwindcss";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import {
  configs as tseslintConfigs,
  parser as tseslintParser,
} from "typescript-eslint";

const config = [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
  },
  sonarjs.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
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
  ...nextVitals,
  {
    languageOptions: importPlugin.flatConfigs.recommended.languageOptions,
    rules: importPlugin.flatConfigs.recommended.rules,
  },
  ...tseslintConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslintParser,
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
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      tailwindcss: tailwind,
    },
    rules: {
      ...tailwind.configs["flat/recommended"][0].rules,
    },
  },
  eslintPluginUnicorn.configs.recommended,
  perfectionistConfigs["recommended-natural"],
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              from: "./src/app",
              target: "./src/features",
            },
            {
              from: [
                "./src/features",
                "./src/app",
              ],
              target: [
                "./src/components",
                "./src/hooks",
                "./src/lib",
                "./src/config",
                "./src/stores",
                "./src/types",
                "./src/utils",
              ],
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
      "unicorn/prevent-abbreviations": [
        "error",
        {
          allowList: {
            API: true,
            Api: true,
            api: true,
            el: true,
            env: true,
            Env: true,
            ext: true,
            utils: true,
            Utils: true,
          },
          checkFilenames: false,
        },
      ],
    },
  },
  {
    ignores: [
      ".next/*",
      "next-env.d.ts",
      "src/__tests__/utils/*",
      "coverage/*",
      "src/components/ui/*",
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
      "@typescript-eslint/no-explicit-any": "off",
      "vitest/max-nested-describe": ["error", { max: 3 }],
    },
  },
  {
    files: ["src/testing/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["e2e/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
  {
    ...playwright.configs["flat/recommended"],
    files: ["e2e/**", "tests/**"],
  },
];

export default config;
