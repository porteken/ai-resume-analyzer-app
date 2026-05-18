import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    coverage: {
      exclude: [
        "node_modules/",
        "src/testing/",
        "src/components/ui/",
        "src/lib/utils.ts",
        ".next/",
        "e2e/",
        "*.config.*",
        "components.json",
      ],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
    },
    environment: "happy-dom",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/.next/**"],
    globals: true,
    setupFiles: ["./src/testing/setup.ts"],
  },
});
