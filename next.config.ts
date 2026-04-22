import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
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
    ];
  },
};

export default nextConfig;
