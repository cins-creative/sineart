import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Giây — tránh fail build khi nhiều trang SSG + DB chậm (mặc định 60). */
  staticPageGenerationTimeout: 120,
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
      /* Blog id-prefix → slug sạch: xem src/proxy.ts (next/config không nhận pattern an toàn cho một segment) */
      {
        source: "/hoc-thu",
        destination: "https://www.facebook.com/sineart0102",
        permanent: true,
      },
      // Gallery — URL Framer cũ (route con chưa có trong App Router)
      {
        source: "/gallery/hinh-hoa",
        destination: "/gallery",
        permanent: true,
      },
      {
        source: "/gallery/trang-tri-mau",
        destination: "/gallery",
        permanent: true,
      },
      {
        source: "/gallery/bo-cuc-mau",
        destination: "/gallery",
        permanent: true,
      },
      // Thi thử — slug môn cũ → danh sách kỳ (Next.js dùng /thi-thu/[id])
      {
        source: "/thi-thu/hinh-hoa",
        destination: "/thi-thu",
        permanent: true,
      },
      {
        source: "/thi-thu/trang-tri-mau",
        destination: "/thi-thu",
        permanent: true,
      },
      {
        source: "/thi-thu/bo-cuc-mau",
        destination: "/thi-thu",
        permanent: true,
      },
      // HR / Hiring — chưa có route Next.js
      {
        source: "/hr/:path*",
        destination: "/",
        permanent: false,
      },
      {
        source: "/hiring/:path*",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
