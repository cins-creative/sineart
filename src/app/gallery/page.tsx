import type { Metadata } from "next";

import NavBar from "../_components/NavBar";
import GalleryClient from "./GalleryClient";
import { GalleryStyles } from "./GalleryStyles";

import { JsonLd } from "@/components/seo/JsonLd";
import { getGalleryPagePayload } from "@/lib/data/home";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import { SITE_ORIGIN, SITE_OG_DEFAULT_IMAGE } from "@/lib/seo/site-jsonld";

export const revalidate = 3600;

const GALLERY_URL = `${SITE_ORIGIN}/gallery` as const;

const GALLERY_DESCRIPTION =
  "Bộ sưu tập bài vẽ từ lớp học tại Sine Art — không chỉnh sửa. Lọc theo môn học (Hình họa, Trang trí màu, Bố cục màu…) hoặc xem các bài mẫu chuẩn.";

/** Không ghi «| Sine Art» — root `title.template` đã thêm suffix. */
const GALLERY_TITLE = "Thư viện bài vẽ học viên — 300+ tác phẩm";

const GALLERY_OG_IMAGE = {
  url: SITE_OG_DEFAULT_IMAGE,
  width: 1200,
  height: 630,
  alt: "Bài vẽ học viên Sine Art — Hình họa, Bố cục màu, Trang trí màu",
} as const;

export const metadata: Metadata = {
  title: GALLERY_TITLE,
  description: GALLERY_DESCRIPTION,
  keywords: [
    "bài vẽ học viên",
    "gallery mỹ thuật",
    "hình họa",
    "bố cục màu",
    "trang trí màu",
    "Sine Art TP.HCM",
  ],
  alternates: { canonical: GALLERY_URL },
  openGraph: {
    title: `${GALLERY_TITLE} | Sine Art`,
    description: GALLERY_DESCRIPTION,
    url: GALLERY_URL,
    siteName: "Sine Art",
    locale: "vi_VN",
    type: "website",
    images: [GALLERY_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${GALLERY_TITLE} | Sine Art`,
    description: GALLERY_DESCRIPTION,
    images: [SITE_OG_DEFAULT_IMAGE],
  },
};

export default async function GalleryPage() {
  const [{ courses }, payload] = await Promise.all([
    getKhoaHocPageData(),
    getGalleryPagePayload(),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  const total = payload.gallery.length;
  const totalMon = payload.galleryMonHocTabs.length;
  const totalBaiMau = payload.gallery.filter((g) => g.baiMau).length;
  const totalStudents = new Set(
    payload.gallery.map((g) => g.studentName.trim()).filter(Boolean),
  ).size;

  const numberOfItems = total > 0 ? total : 300;

  const galleryCollectionSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Thư viện bài vẽ học viên Sine Art",
    description:
      "300+ tác phẩm từ học viên Sine Art — Hình họa, Trang trí màu, Bố cục màu, Background, Sine Kids. Không chỉnh sửa.",
    url: GALLERY_URL,
    isPartOf: {
      "@type": "WebSite",
      name: "Sine Art",
      url: SITE_ORIGIN,
    },
    about: {
      "@type": "EducationalOrganization",
      name: "Sine Art",
      url: SITE_ORIGIN,
    },
    numberOfItems,
  };

  const galleryBreadcrumbSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: SITE_ORIGIN,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Bài học viên",
        item: GALLERY_URL,
      },
    ],
  };

  return (
    <div className="sa-root sa-gallery">
      <NavBar khoaHocGroups={khoaHocGroups} />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="page-hero">
        <div className="page-hero-bg" />
        <span className="blob blob-a" aria-hidden />
        <span className="blob blob-b" aria-hidden />
        <span className="blob blob-c" aria-hidden />
        <div className="page-hero-inner">
          <div>
            <div className="ph-eyebrow">
              <span className="dot">✦</span>
              Sine Art · {total > 0 ? `${total}+ tác phẩm` : "Thư viện tác phẩm"}
            </div>
            <h1>
              Sản phẩm từ <em>học viên</em> đã và đang học tại Sine Art
            </h1>
          </div>
          <div className="ph-side">
            <div className="ph-stat">
              <div className="n">
                <em>{total > 0 ? `${total}+` : "300+"}</em>
              </div>
              <div className="l">
                Tác phẩm học viên
                <br />
                <span>Từ các lớp Sine Art</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">{totalMon > 0 ? totalMon : 4}</div>
              <div className="l">
                Môn học
                <br />
                <span>Hình họa, trang trí màu…</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">
                {totalBaiMau > 0 ? totalBaiMau : totalStudents || "—"}
              </div>
              <div className="l">
                Bài mẫu chuẩn
                <br />
                <span>Được chọn làm tiêu chí</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOOLBAR + GRID + LIGHTBOX ────────────────────────────────── */}
      <GalleryClient
        items={payload.gallery}
        monHocTabs={payload.galleryMonHocTabs}
        itemsPerPage={40}
      />

      <GalleryStyles />
      <JsonLd schema={galleryCollectionSchema} />
      <JsonLd schema={galleryBreadcrumbSchema} />
    </div>
  );
}
