import type { Metadata } from "next";
import { Suspense } from "react";
import { KhoaHocPageSkeleton } from "@/components/skeletons";
import { SITE_OG_DEFAULT_IMAGE } from "@/lib/seo/site-jsonld";
import "./khoa-hoc.css";
import { KhoaHocPageContent } from "./KhoaHocPageContent";

export const revalidate = 300;

const KHOA_HOC_LISTING_DESC =
  "7 khóa học mỹ thuật tại TP.HCM — Hình họa, Bố cục màu, Trang trí màu, Digital Art, Luyện thi tại lớp. Online & tại lớp. Lớp mới khai giảng hàng tuần.";

const khoaHocOgImage = {
  url: SITE_OG_DEFAULT_IMAGE,
  width: 1200,
  height: 630,
  alt: "Các khóa học mỹ thuật tại Sine Art — Online & tại lớp TP.HCM",
} as const;

export const metadata: Metadata = {
  title: "Các khóa học vẽ mỹ thuật tại Sine Art",
  description: KHOA_HOC_LISTING_DESC,
  alternates: { canonical: "https://sineart.vn/khoa-hoc" },
  openGraph: {
    title: "Các khóa học vẽ mỹ thuật tại Sine Art",
    description: KHOA_HOC_LISTING_DESC,
    url: "https://sineart.vn/khoa-hoc",
    type: "website",
    locale: "vi_VN",
    siteName: "Sine Art",
    images: [khoaHocOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Các khóa học vẽ mỹ thuật tại Sine Art",
    description: KHOA_HOC_LISTING_DESC,
    images: [SITE_OG_DEFAULT_IMAGE],
  },
};

export default function KhoaHocPage({
  searchParams,
}: {
  searchParams: Promise<{ nhom?: string }>;
}) {
  return (
    <div className="sa-root khoa-hoc-page khoa-hoc-catalog">
      <Suspense fallback={<KhoaHocPageSkeleton />}>
        <KhoaHocPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
