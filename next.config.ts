import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Bật nén phản hồi (gzip) — mặc định thường true; ghi rõ theo cấu hình dự án. */
  compress: true,
  /** Giây — tránh fail build khi nhiều trang SSG + DB chậm (mặc định 60). */
  staticPageGenerationTimeout: 120,
  outputFileTracingRoot: __dirname,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
        pathname: "/**",
      },
      /** Ảnh public Supabase (thumbnail ngành CINS, v.v.) — `next/image` bắt buộc khai báo host. */
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/**",
      },
      /** CDN / site CINS nếu thumbnail trỏ tuyệt đối về domain này */
      {
        protocol: "https",
        hostname: "cins.vn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.cins.vn",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    /** Ảnh chat / upload lớn — tránh 413 & plain-text “Request Entity Too Large” khi proxy dev. */
    proxyClientMaxBodySize: "25mb",
    serverActions: {
      bodySizeLimit: "25mb",
    },
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
