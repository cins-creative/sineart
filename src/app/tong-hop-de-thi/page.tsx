import type { Metadata } from "next";
import { Suspense } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import NavBar from "../_components/NavBar";
import DeThiListClient from "./DeThiListClient";
import { DeThiStyles } from "./DeThiStyles";
import { fetchAllDeThi, fetchTruongLookup } from "@/lib/data/de-thi";
import { getKhoaHocNavGroups } from "@/lib/nav/build-khoa-hoc-nav";
import {
  buildTongHopDeThiListingBreadcrumbJsonLd,
  buildTongHopDeThiListingCollectionJsonLd,
} from "@/lib/seo/tong-hop-de-thi-jsonld";
import { SITE_OG_DEFAULT_IMAGE, SITE_ORIGIN } from "@/lib/seo/site-jsonld";

export const revalidate = 600;

const LISTING_PATH = "/tong-hop-de-thi" as const;
const LISTING_URL = `${SITE_ORIGIN}${LISTING_PATH}` as const;

/** Không ghi «| Sine Art» — root `title.template` đã thêm suffix. */
const LISTING_TITLE = "Tổng hợp đề thi mỹ thuật";

const LISTING_DESCRIPTION =
  "Thư viện 75+ đề thi mỹ thuật — Bố cục màu, Trang trí màu từ 2017–2026. Kèm OCR đề gốc và lời giải. Biên soạn bởi giáo viên Sine Art, lọc theo môn · năm · trường.";

const LISTING_OG_IMAGE = {
  url: SITE_OG_DEFAULT_IMAGE,
  width: 1200,
  height: 630,
  alt: "Tổng hợp đề thi mỹ thuật — Sine Art",
} as const;

export const metadata: Metadata = {
  title: LISTING_TITLE,
  description: LISTING_DESCRIPTION,
  alternates: { canonical: LISTING_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${LISTING_TITLE} | Sine Art`,
    description: LISTING_DESCRIPTION,
    url: LISTING_URL,
    type: "website",
    locale: "vi_VN",
    siteName: "Sine Art",
    images: [LISTING_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${LISTING_TITLE} | Sine Art`,
    description: LISTING_DESCRIPTION,
    images: [SITE_OG_DEFAULT_IMAGE],
  },
};

export default async function TongHopDeThiPage() {
  const [items, truongLookup, khoaHocGroups] = await Promise.all([
    fetchAllDeThi(),
    fetchTruongLookup(),
    getKhoaHocNavGroups(),
  ]);

  const namSet = new Set<number>();
  const monSet = new Set<string>();
  const mauSet = new Set<string>();
  for (const it of items) {
    if (it.nam != null) namSet.add(it.nam);
    for (const m of it.mon) monSet.add(m);
    for (const m of it.loai_mau_hinh_hoa) mauSet.add(m);
  }

  const namOptions = Array.from(namSet).sort((a, b) => b - a);
  const monOptions = Array.from(monSet).sort();
  const mauOptions = Array.from(mauSet).sort();

  const collectionJsonLd = buildTongHopDeThiListingCollectionJsonLd(items.length);
  const breadcrumbJsonLd = buildTongHopDeThiListingBreadcrumbJsonLd();

  return (
    <div className="sa-root sa-dethi">
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
              Sine Art · {items.length > 0 ? `${items.length} đề thi` : "Đề thi luyện tập"}
            </div>
            <h1>
              Tổng hợp <em>đề thi</em>
              <br />
              mỹ thuật.
            </h1>
            <p className="lead">
              Thư viện đề luyện thi Bố cục màu, Trang trí màu — biên soạn bởi giáo viên Sine Art,
              kèm OCR đề gốc và lời giải. Dùng để luyện tập bài bản theo đúng format đề thi các
              trường đại học.
            </p>
          </div>
          <div className="ph-side">
            <div className="ph-stat">
              <div className="n">
                <em>{items.length > 0 ? `${items.length}+` : "—"}</em>
              </div>
              <div className="l">
                Đề thi đã biên soạn
                <br />
                <span>Cập nhật hàng năm</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">{monOptions.length || "—"}</div>
              <div className="l">
                Môn thi
                <br />
                <span>Bố cục màu · Trang trí màu…</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">{namOptions.length || "—"}</div>
              <div className="l">
                Năm thi
                <br />
                <span>
                  {namOptions.length > 0
                    ? `${namOptions[namOptions.length - 1]} – ${namOptions[0]}`
                    : "Đang cập nhật"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="shell" style={{ padding: "40px 0" }}>
            <div className="sec-label">Đang tải…</div>
          </div>
        }
      >
        <DeThiListClient
          items={items}
          truongLookup={truongLookup}
          namOptions={namOptions}
          monOptions={monOptions}
          mauOptions={mauOptions}
        />
      </Suspense>

      <DeThiStyles />
    </div>
  );
}
