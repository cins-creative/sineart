import type { Metadata } from "next";
import Script from "next/script";

import NavBar from "../_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import {
  fetchAllLyThuyet,
  groupByNhom,
  toCard,
} from "@/lib/data/ly-thuyet";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

import KienThucNenTangView, {
  type LandingGroup,
} from "./KienThucNenTangView";
import "./kien-thuc-library.css";

/**
 * Revalidate ISR — tài liệu thư viện cập nhật không thường xuyên, nên cache
 * 10 phút là hợp lý (giống các trang content khác: blogs, de-thi).
 */
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Thư viện kiến thức mỹ thuật nền tảng | Sine Art",
  description:
    "Thư viện bài lý thuyết nền tảng — nguyên lý tạo hình, bố cục, giải phẫu, màu sắc, sắc độ và vật liệu — do đội ngũ Sine Art biên soạn.",
  keywords: [
    "thư viện Sine Art",
    "lý thuyết mỹ thuật",
    "cơ sở tạo hình",
    "nguyên lý thị giác",
    "khối H",
    "khối V",
  ],
  alternates: {
    canonical: "https://sineart.vn/kien-thuc-nen-tang",
  },
  openGraph: {
    title: "Thư viện kiến thức mỹ thuật nền tảng | Sine Art",
    description:
      "Tập hợp các bài lý thuyết nền tảng cho học sinh thi khối H, V và người yêu mỹ thuật.",
    locale: "vi_VN",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default async function KienThucNenTangPage() {
  const [items, { courses }] = await Promise.all([
    fetchAllLyThuyet(),
    getKhoaHocPageData(),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  const grouped = groupByNhom(items);
  const groups: LandingGroup[] = grouped.map((g) => ({
    nhom: g.nhom,
    items: g.items.map(toCard),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Thư viện kiến thức mỹ thuật nền tảng — Sine Art",
    description:
      "Tập hợp các bài lý thuyết nền tảng về nguyên lý tạo hình, bố cục, giải phẫu, màu sắc, sắc độ và vật liệu.",
    url: "https://sineart.vn/kien-thuc-nen-tang",
    inLanguage: "vi-VN",
    isPartOf: {
      "@type": "WebSite",
      name: "Sine Art",
      url: "https://sineart.vn",
    },
    hasPart: items.slice(0, 20).map((it) => ({
      "@type": "Article",
      headline: it.ten,
      description: it.short_content ?? undefined,
      url: `https://sineart.vn/kien-thuc-nen-tang/${it.slug}`,
      articleSection: it.nhom ?? undefined,
    })),
  };

  return (
    <>
      <Script
        id="ktn-landing-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="sa-root kien-thuc-nen-tang-root">
        <NavBar khoaHocGroups={khoaHocGroups} />
        <KienThucNenTangView groups={groups} />
      </div>
    </>
  );
}
