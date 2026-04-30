import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async redirects() {
    return [
      {
        source: "/tinh-diem",
        destination: "/tra-cuu-thong-tin",
        permanent: true,
      },
      {
        source: "/hoc-thu",
        destination: "https://www.facebook.com/sineart0102",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
