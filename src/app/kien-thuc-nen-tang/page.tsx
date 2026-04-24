import type { Metadata } from "next";
import Script from "next/script";

import NavBar from "../_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import { LY_THUYET_LIST, getNhomList, getByNhom } from "@/data/ly-thuyet";

import KienThucNenTangView, { type LandingGroup } from "./KienThucNenTangView";
import "./kien-thuc-library.css";

/** Listing page dùng config hardcode — không query DB */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Thư viện kiến thức mỹ thuật nền tảng | Sine Art",
  description:
    "Thư viện bài lý thuyết nền tảng — nguyên lý tạo hình, bố cục, giải phẫu, màu sắc, sắc độ và vật liệu — do đội ngũ Sine Art biên soạn.",
  keywords: ["thư viện Sine Art", "lý thuyết mỹ thuật", "cơ sở tạo hình", "nguyên lý thị giác", "khối H", "khối V"],
  alternates: { canonical: "https://sineart.vn/kien-thuc-nen-tang" },
  openGraph: {
    title: "Thư viện kiến thức mỹ thuật nền tảng | Sine Art",
    description: "Tập hợp các bài lý thuyết nền tảng cho học sinh thi khối H, V và người yêu mỹ thuật.",
    locale: "vi_VN",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default async function KienThucNenTangPage() {
  const { courses } = await getKhoaHocPageData();
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);
  const nhomList = getNhomList();

  const groups: LandingGroup[] = nhomList.map((nhom) => ({
    nhom,
    items: getByNhom(nhom).map((item) => ({
      id: item.so_thu_tu,
      slug: item.slug,
      ten: item.ten,
      nhom: item.nhom,
      shortContent: item.mo_ta,
      thumbnail: item.thumbnail ?? null,
      tags: item.tags,
      readingMin: item.doc_time,
    })),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Thư viện kiến thức mỹ thuật nền tảng — Sine Art",
    description: "Tập hợp các bài lý thuyết nền tảng về nguyên lý tạo hình, bố cục, giải phẫu, màu sắc, sắc độ và vật liệu.",
    url: "https://sineart.vn/kien-thuc-nen-tang",
    inLanguage: "vi-VN",
    isPartOf: { "@type": "WebSite", name: "Sine Art", url: "https://sineart.vn" },
    hasPart: LY_THUYET_LIST.map((it) => ({
      "@type": "Article",
      headline: it.ten,
      description: it.mo_ta,
      url: `https://sineart.vn/kien-thuc-nen-tang/${it.slug}`,
      articleSection: it.nhom,
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
