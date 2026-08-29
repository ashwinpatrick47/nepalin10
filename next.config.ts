import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      // Cloudinary-hosted images (uploaded via the /admin CMS media
      // library) — needed so next/image is allowed to optimize/serve them.
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async rewrites() {
    return [
      // Next only serves public/ files at their exact path — it doesn't do
      // static hosts' usual "/admin" -> "/admin/index.html" directory
      // resolution, so visiting /admin directly would 404 without this.
      { source: "/admin", destination: "/admin/index.html" },
    ];
  },
};

export default nextConfig;
