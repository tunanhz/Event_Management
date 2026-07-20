import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mobile HTTPS development uses a separate build directory so it can run
  // alongside the normal HTTP dev server without competing for Next's lock.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Keep Turbopack scoped to this frontend instead of a lockfile higher in
  // the Windows user directory.
  turbopack: {
    root: process.cwd(),
  },

  // Rewrites to proxy API requests to Express backend
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
      // Uploaded files (banners, permits, signatures) served by the backend —
      // proxied so stored /uploads/... URLs render directly in FE previews.
      {
        source: "/uploads/:path*",
        destination: `${backend}/uploads/:path*`,
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
