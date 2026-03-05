import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
    },
  },
  test: {
    coverage: {
      exclude: [
        "node_modules/",
        "tests/",
        ".next/",
        "e2e/",
        "*.config.*",
        "components.json",
      ],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
    },
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/.next/**"],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
