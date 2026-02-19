import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Force TypeScript to ignore errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // 2. Force ESLint to ignore errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;