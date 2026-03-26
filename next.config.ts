import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
