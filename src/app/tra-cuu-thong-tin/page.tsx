import type { Metadata } from "next";
import { Suspense } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import NavBar from "../_components/NavBar";
import TraCuuListClient from "./TraCuuListClient";
import { TraCuuStyles } from "./TraCuuStyles";
import { fetchAllTraCuu, fetchTruongLookup } from "@/lib/data/tra-cuu";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import {
  buildTraCuuListingBreadcrumbJsonLd,
  buildTraCuuListingCollectionJsonLd,
} from "@/lib/seo/tra-cuu-jsonld";
import { SITE_OG_DEFAULT_IMAGE, SITE_ORIGIN } from "@/lib/seo/site-jsonld";

export const revalidate = 600;

const LISTING_PATH = "/tra-cuu-thong-tin" as const;
const LISTING_URL = `${SITE_ORIGIN}${LISTING_PATH}` as const;

/** Không ghi «| Sine Art» — root `title.template` đã thêm suffix. */
const LISTING_TITLE = "Tra cứu thông tin thi đại học mỹ thuật";

const LISTING_OG_IMAGE = {
  url: SITE_OG_DEFAULT_IMAGE,
  width: 1200,
  height: 630,
  alt: "Tra cứu thông tin thi đại học mỹ thuật — Sine Art",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const items = await fetchAllTraCuu();
  const n = items.length;
  const description = `${n} bài tra cứu thông tin tuyển sinh mỹ thuật — điểm chuẩn, phương thức xét tuyển, cách tính điểm từ 15+ trường đại học. Cập nhật hàng năm bởi Sine Art.`;

  return {
    title: LISTING_TITLE,
    description,
    alternates: { canonical: LISTING_URL },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${LISTING_TITLE} | Sine Art`,
      description,
      url: LISTING_URL,
      type: "website",
      locale: "vi_VN",
      siteName: "Sine Art",
      images: [LISTING_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${LISTING_TITLE} | Sine Art`,
      description,
      images: [SITE_OG_DEFAULT_IMAGE],
    },
  };
}

export default async function TraCuuListPage() {
  const [items, truongLookup, { courses }] = await Promise.all([
    fetchAllTraCuu(),
    fetchTruongLookup(),
    getKhoaHocPageData(),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  const totalTruong = new Set(items.flatMap((it) => it.truong_ids)).size;
  const totalTypes = new Set(items.flatMap((it) => it.type)).size;

  const collectionJsonLd = buildTraCuuListingCollectionJsonLd(items.length);
  const breadcrumbJsonLd = buildTraCuuListingBreadcrumbJsonLd();

  return (
    <div className="sa-root sa-tracuu">
      <JsonLd schema={collectionJsonLd} />
      <JsonLd schema={breadcrumbJsonLd} />
      <NavBar khoaHocGroups={khoaHocGroups} />

      {/* HERO */}
      <section className="page-hero">
        <div className="page-hero-bg" />
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
        <div className="shell page-hero-inner">
          <div>
            <div className="ph-eyebrow">
              <span className="dot">≡</span>
              Sine Art · {items.length > 0 ? `${items.length} bài tra cứu` : "Tra cứu tuyển sinh"}
            </div>
            <h1>
              Tra cứu <em>thông tin</em>
              <br />
              tuyển sinh.
            </h1>
            <p className="lead">
              Điểm chuẩn, phương thức xét tuyển, cách tính điểm, chương trình học và kinh nghiệm thi
              từ các trường đại học đối tác — tổng hợp chính xác bởi Sine Art.
            </p>
          </div>
          <div className="ph-side">
            <div className="ph-stat">
              <div className="n">
                <em>{items.length > 0 ? `${items.length}+` : "—"}</em>
              </div>
              <div className="l">
                Bài tra cứu đã công bố
                <br />
                <span>Được cập nhật mới</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">{totalTruong || "—"}</div>
              <div className="l">
                Thông tin từ các trường đại học
                <br />
                <span>Nguồn tin chính thức</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">{totalTypes || "—"}</div>
              <div className="l">
                Loại thông tin
                <br />
                <span>Điểm chuẩn · Phương thức · Ngành học…</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIST + FILTER (client) */}
      <Suspense
        fallback={
          <div className="shell" style={{ padding: "40px 0" }}>
            <div className="sec-label">Đang tải…</div>
          </div>
        }
      >
        <TraCuuListClient items={items} truongLookup={truongLookup} />
      </Suspense>

      <TraCuuStyles />
    </div>
  );
}
