import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/quan-ly", "/api", "/_next", "/thanhtoan", "/hr"],
    },
    sitemap: "https://sineart.vn/sitemap.xml",
  };
}
