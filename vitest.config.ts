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
    env: {
      VITE_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    },
    coverage: {
      exclude: [
        "node_modules/",
        "src/testing/",
        "src/components/ui/",
        "src/lib/utils.ts",
        "dist/",
        "e2e/",
        "*.config.*",
        "components.json",
      ],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
    },
    environment: "happy-dom",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    globals: true,
    setupFiles: ["./src/testing/setup.ts"],
  },
});
