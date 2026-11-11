import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  devIndicators: false,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const djangoApi = (
      process.env.DJANGO_API_URL ?? "http://127.0.0.1:8000/api"
    ).replace(/\/+$/, "");
    return [
      { source: "/api/:path*/", destination: `${djangoApi}/:path*/` },
      { source: "/api/:path*", destination: `${djangoApi}/:path*/` },
    ];
  },
};
export default nextConfig;
