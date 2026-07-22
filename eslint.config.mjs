import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import oxlint from "eslint-plugin-oxlint";
import playwright from "eslint-plugin-playwright";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "next-env.d.ts",
      "src/__tests__/utils/**",
      "src/components/ui/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.{jsx,tsx}"],
    extends: [betterTailwindcss.configs.recommended],
    rules: {
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/app/globals.css",
      },
    },
  },
  {
    files: ["e2e/**/*.ts", "playwright.config.ts"],
    extends: [playwright.configs["flat/recommended"]],
    rules: {
      "playwright/expect-expect": [
        "warn",
        {
          assertFunctionNames: [
            "gotoAndWaitForMapPage",
            "gotoRankingsPage",
            "navigateToLocationDetailsFromMap",
            "openLocationDetailsModal",
            "waitForLocationDetailsPage",
            "waitForMapPage",
          ],
        },
      ],
    },
  },
  ...oxlint.configs["flat/recommended"],
]);
