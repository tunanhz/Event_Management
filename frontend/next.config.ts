import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rewrites to proxy API requests to Express backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/:path*`,
      },
    ];
  },

  // Image optimization config
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Enable React strict mode
  reactStrictMode: true,
};

export default nextConfig;
