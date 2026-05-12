import { buildDeThiHref } from "@/lib/data/de-thi-shared";
import type { DeThiDetail } from "@/lib/data/de-thi-shared";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import { SITE_LOGO_URL, SITE_ORIGIN } from "@/lib/seo/site-jsonld";

const CATALOG_URL = `${SITE_ORIGIN}/tong-hop-de-thi`;

/** Đồng bộ với metadata listing — mô tả ngắn cho JSON-LD CollectionPage. */
export const TONG_HOP_DE_THI_LISTING_DESC_SHORT =
  "75+ đề thi Bố cục màu và Trang trí màu từ 2017–2026, kèm OCR đề gốc và lời giải";

function toIso8601(isoLike: string | null | undefined): string | undefined {
  if (!isoLike?.trim()) return undefined;
  const d = new Date(isoLike.trim());
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toSchemaDate(isoLike: string | null | undefined): string | undefined {
  const iso = toIso8601(isoLike);
  return iso ? iso.slice(0, 10) : undefined;
}

export function detailDescription(post: DeThiDetail): string {
  const ex = post.excerpt?.trim();
  if (ex) {
    const p = stripHtmlToPlain(ex, 600);
    if (p.trim()) return p.trim();
  }
  const body = stripHtmlToPlain(post.body_html, 400);
  if (body.trim()) return body.trim();
  return `${post.ten?.trim() || "Đề thi"} — Đề luyện thi mỹ thuật tại Sine Art.`;
}

function primaryImage(url: string | null | undefined): string | undefined {
  const raw = url?.trim();
  if (!raw) return undefined;
  return cfImageForThumbnail(raw) ?? raw;
}

/**
 * `/tong-hop-de-thi` — `CollectionPage` (độc lập, một `<script>` JSON-LD).
 */
export function buildTongHopDeThiListingCollectionJsonLd(
  numberOfItems: number,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tổng hợp đề thi mỹ thuật — Sine Art",
    description: TONG_HOP_DE_THI_LISTING_DESC_SHORT,
    url: CATALOG_URL,
    numberOfItems,
    inLanguage: "vi-VN",
    isPartOf: {
      "@type": "WebSite",
      name: "Sine Art",
      url: SITE_ORIGIN,
    },
  };
}

/** Breadcrumb listing — mục 2 nhãn «Đề thi» theo brief SEO. */
export function buildTongHopDeThiListingBreadcrumbJsonLd(): Record<string, unknown> {
  return {
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
        name: "Đề thi",
        item: CATALOG_URL,
      },
    ],
  };
}

/**
 * `/tong-hop-de-thi/[slug]` — `LearningResource` (đề thi = tài liệu học tập).
 * `tenTruong`: tên trường đầu tiên từ `truong_ids` + lookup (có thể null).
 */
export function buildTongHopDeThiLearningResourceJsonLd(
  post: DeThiDetail,
  tenTruong: string | null,
): Record<string, unknown> | null {
  const slug = post.slug?.trim();
  if (!slug) return null;

  const path = buildDeThiHref(slug);
  const pageUrl = `${SITE_ORIGIN}${path}`;
  const desc = detailDescription(post);
  const img = primaryImage(post.thumbnail_url);
  const monThi = post.mon[0]?.trim() || "Mỹ thuật";
  const datePart = toSchemaDate(post.updated_at ?? post.created_at);

  const name =
    post.nam != null && tenTruong?.trim()
      ? `Đề thi ${monThi} — ${tenTruong.trim()} ${post.nam}`
      : post.ten?.trim() || "Đề thi";

  const loaiMau =
    post.loai_mau_hinh_hoa.length > 0 ? post.loai_mau_hinh_hoa.join(", ") : undefined;

  const description =
    loaiMau && !desc.toLowerCase().includes(loaiMau.toLowerCase())
      ? `${desc} Mẫu: ${loaiMau}.`
      : desc;

  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name,
    description,
    url: pageUrl,
    inLanguage: "vi",
    teaches: monThi,
    educationalLevel: "upperSecondary",
    learningResourceType: "ExamQuestion",
    about: { "@type": "Thing", name: monThi },
    isPartOf: {
      "@type": "CollectionPage",
      name: "Tổng hợp đề thi mỹ thuật — Sine Art",
      url: CATALOG_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Sine Art",
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: SITE_LOGO_URL,
      },
    },
  };

  if (img) out.image = img;
  if (datePart) {
    out.datePublished = datePart;
    out.dateModified = datePart;
  }
  if (tenTruong?.trim()) {
    out.provider = {
      "@type": "EducationalOrganization",
      name: tenTruong.trim(),
    };
  }

  return out;
}

export function buildTongHopDeThiDetailBreadcrumbJsonLd(
  post: DeThiDetail,
  tenTruong: string | null,
): Record<string, unknown> | null {
  const slug = post.slug?.trim();
  if (!slug) return null;

  const path = buildDeThiHref(slug);
  const pageUrl = `${SITE_ORIGIN}${path}`;
  const crumb3Name =
    post.nam != null && tenTruong?.trim()
      ? `${tenTruong.trim()} ${post.nam}`
      : post.ten?.trim() || "Đề thi";

  return {
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
        name: "Đề thi",
        item: CATALOG_URL,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: crumb3Name,
        item: pageUrl,
      },
    ],
  };
}
