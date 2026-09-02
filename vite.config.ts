import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { apiDevPlugin } from "./src/server/dev-middleware.ts";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      apiDevPlugin({
        API_ENDPOINT: environment.API_ENDPOINT,
        API_KEY: environment.API_KEY,
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 3000,
    },
  };
});
