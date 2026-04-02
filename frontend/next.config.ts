import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["118.89.26.195", "10.1.0.9"],
  serverExternalPackages: ["@imgly/background-removal"],
  // Static export for Cloudflare Pages deployment
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
