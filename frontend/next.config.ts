import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["118.89.26.195", "10.1.0.9"],
  serverExternalPackages: ["@imgly/background-removal"],
  // Note: output: "export" removed for Cloudflare Pages SSR support
  // API routes work with Cloudflare Pages Functions (Workers)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
