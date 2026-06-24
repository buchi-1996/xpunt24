import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't fail production builds on lint errors (type-checking still runs).
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
          hostname: "media.api-sports.io",
        },
        {
          protocol: "https",
          hostname: "lh3.googleusercontent.com",
      },
    ], // Configure external image domains here
  },
};

export default nextConfig;
