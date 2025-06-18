import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize Three.js bundle size
  transpilePackages: ["three"],

  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
  },
};

export default nextConfig;
