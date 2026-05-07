import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import { SITE_ORIGIN } from "@/lib/seo/site-jsonld";
import type { HocPhiBlockData, HocPhiGoiRow, KhoaHocDetailData } from "@/types/khoa-hoc";

const ORG_REF = { "@id": `${SITE_ORIGIN}/#organization` as const };

function absoluteUrl(url: string | null | undefined): string | undefined {
  const u = url?.trim();
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  return `${SITE_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;
}

/** Giá sau giảm — cùng công thức `mapHpGoiHocPhiRow` / `hocPhiThucDong`. */
function hocPhiGoiEffectivePrice(g: HocPhiGoiRow): number {
  const d = Math.min(100, Math.max(0, g.discount));
  return Math.round((g.gia_goc * (100 - d)) / 100);
}

/**
 * Thu thập mọi mức học phí hiển thị được (legacy `goiHocPhi` + gói widget `hp_*`).
 * Chỉ lấy giá &gt; 0.
 */
function collectTuitionPricesVnd(
  detail: KhoaHocDetailData,
  hocPhiBlock: HocPhiBlockData | null
): number[] {
  const out: number[] = [];
  for (const g of detail.goiHocPhi) {
    const p = Math.round(Number(g.hocPhiThucDong));
    if (Number.isFinite(p) && p > 0) out.push(p);
  }
  if (hocPhiBlock?.gois?.length) {
    for (const g of hocPhiBlock.gois) {
      const p = hocPhiGoiEffectivePrice(g);
      if (Number.isFinite(p) && p > 0) out.push(p);
    }
  }
  return out;
}

function courseDescriptionPlain(detail: KhoaHocDetailData): string {
  const fromIntro = stripHtmlToPlain(detail.gioiThieuMonHocHtml, 5000);
  if (fromIntro.trim()) return fromIntro.trim();
  const sub = detail.tinhChat?.trim();
  if (sub) return sub;
  return detail.tenMonHoc.trim() || "Khóa học tại Sine Art";
}

function buildOffers(
  detail: KhoaHocDetailData,
  hocPhiBlock: HocPhiBlockData | null,
  courseUrl: string
): Record<string, unknown> | undefined {
  const prices = collectTuitionPricesVnd(detail, hocPhiBlock);
  if (!prices.length) return undefined;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const offerRows = detail.goiHocPhi.length + (hocPhiBlock?.gois.length ?? 0);

  if (!Number.isFinite(min) || min <= 0) return undefined;

  if (max <= min || prices.length === 1) {
    return {
      "@type": "Offer",
      url: courseUrl,
      priceCurrency: "VND",
      price: String(Math.round(min)),
      availability: "https://schema.org/InStock",
      description:
        "Học phí tham khảo — mức thấp nhất trong các gói học phí hiện có cho khóa này (VNĐ, đã gồm giảm giá nếu có).",
    };
  }

  return {
    "@type": "AggregateOffer",
    url: courseUrl,
    priceCurrency: "VND",
    lowPrice: String(Math.round(min)),
    highPrice: String(Math.round(max)),
    offerCount: Math.max(1, offerRows),
    availability: "https://schema.org/InStock",
    description:
      "Khoảng học phí theo gói — mức thấp nhất là giá rẻ nhất trong các lựa chọn hiển thị (VNĐ).",
  };
}

/**
 * JSON-LD `@graph`: Course (có học phí) + BreadcrumbList.
 * Học phí: min trên union legacy + block widget; AggregateOffer nếu có nhiều mức.
 */
export function buildKhoaHocDetailJsonLd(
  detail: KhoaHocDetailData,
  slug: string,
  hocPhiBlock: HocPhiBlockData | null
): Record<string, unknown> {
  const courseUrl = `${SITE_ORIGIN}/khoa-hoc/${encodeURIComponent(slug)}`;
  const desc = courseDescriptionPlain(detail);
  const img = absoluteUrl(detail.thumbnail);
  const offers = buildOffers(detail, hocPhiBlock, courseUrl);

  const course: Record<string, unknown> = {
    "@type": "Course",
    "@id": `${courseUrl}#course`,
    name: detail.tenMonHoc.trim(),
    description: desc,
    url: courseUrl,
    inLanguage: "vi-VN",
    availableLanguage: "vi",
    provider: ORG_REF,
  };

  if (img) course.image = img;

  if (offers) course.offers = offers;

  return {
    "@context": "https://schema.org",
    "@graph": [
      course,
      {
        "@type": "BreadcrumbList",
        "@id": `${courseUrl}#breadcrumb`,
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
            name: "Khóa học",
            item: `${SITE_ORIGIN}/khoa-hoc`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: detail.tenMonHoc.trim(),
            item: courseUrl,
          },
        ],
      },
    ],
  };
}
