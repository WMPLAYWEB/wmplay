import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./src/data/catalog.db"],
  },
};

export default nextConfig;
