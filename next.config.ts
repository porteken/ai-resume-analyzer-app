import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  headers: async () => [
    {
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
      source: "/(.*)",
    },
  ],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
