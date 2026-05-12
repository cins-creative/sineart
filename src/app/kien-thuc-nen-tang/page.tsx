import type { Metadata } from "next";
import { Suspense } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import { LY_THUYET_LIST, getNhomList, getByNhom } from "@/data/ly-thuyet";
import { SITE_ORIGIN, SITE_OG_DEFAULT_IMAGE } from "@/lib/seo/site-jsonld";

import { KienThucLandingNav } from "./_components/KienThucLandingNav";
import { NavBarBoundarySkeleton } from "./_components/NavBarBoundary.skeleton";
import KienThucNenTangView, { type LandingGroup } from "./KienThucNenTangView";
import "./kien-thuc-library.css";

/** Listing: dữ liệu grid từ hardcode; chỉ NavBar gọi Supabase (trong `KienThucLandingNav`). */
export const dynamic = "force-static";

const LISTING_PATH = "/kien-thuc-nen-tang" as const;
const LISTING_URL = `${SITE_ORIGIN}${LISTING_PATH}` as const;

/** Không ghi «| Sine Art» — root `title.template` đã thêm suffix. */
const LISTING_TITLE = "Thư viện kiến thức mỹ thuật nền tảng";

const N_BAI_LY_THUYET = LY_THUYET_LIST.length;

const LISTING_DESCRIPTION = `${N_BAI_LY_THUYET} bài lý thuyết mỹ thuật nền tảng — nguyên lý tạo hình, bố cục, giải phẫu, màu sắc. Do đội ngũ Sine Art biên soạn cho học sinh thi khối H, V và người yêu mỹ thuật.`;

const LISTING_OG_IMAGE = {
  url: SITE_OG_DEFAULT_IMAGE,
  width: 1200,
  height: 630,
  alt: "Thư viện kiến thức mỹ thuật nền tảng — Sine Art",
} as const;

export const metadata: Metadata = {
  title: LISTING_TITLE,
  description: LISTING_DESCRIPTION,
  keywords: ["thư viện Sine Art", "lý thuyết mỹ thuật", "cơ sở tạo hình", "nguyên lý thị giác", "khối H", "khối V"],
  alternates: { canonical: LISTING_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${LISTING_TITLE} | Sine Art`,
    description: LISTING_DESCRIPTION,
    url: LISTING_URL,
    siteName: "Sine Art",
    locale: "vi_VN",
    type: "website",
    images: [LISTING_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${LISTING_TITLE} | Sine Art`,
    description: LISTING_DESCRIPTION,
    images: [SITE_OG_DEFAULT_IMAGE],
  },
};

export default function KienThucNenTangPage() {
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

  const itemListElement = LY_THUYET_LIST.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.ten,
    url: `${SITE_ORIGIN}${LISTING_PATH}/${encodeURIComponent(item.slug)}`,
  }));

  const collectionSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Thư viện kiến thức mỹ thuật nền tảng",
    description: `${N_BAI_LY_THUYET} bài lý thuyết mỹ thuật nền tảng do đội ngũ Sine Art biên soạn.`,
    url: LISTING_URL,
    numberOfItems: LY_THUYET_LIST.length,
    inLanguage: "vi-VN",
    isPartOf: {
      "@type": "WebSite",
      name: "Sine Art",
      url: SITE_ORIGIN,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: LY_THUYET_LIST.length,
      itemListElement,
    },
  };

  const breadcrumbSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: `${SITE_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Kiến thức nền tảng",
        item: LISTING_URL,
      },
    ],
  };

  return (
    <>
      <JsonLd schema={collectionSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <div className="sa-root kien-thuc-nen-tang-root">
        <Suspense fallback={<NavBarBoundarySkeleton />}>
          <KienThucLandingNav />
        </Suspense>
        <KienThucNenTangView groups={groups} />
      </div>
    </>
  );
}
