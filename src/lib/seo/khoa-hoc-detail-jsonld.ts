import {
  dedupeMon1Pills,
  groupMon1ByPostTitle,
  isHocPhiCapTocSpecial,
} from "@/lib/hocPhiDedupe";
import { KHOA_HOC_COURSE_FAQ } from "@/lib/seo/khoa-hoc-course-faq";
import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import { SITE_ORIGIN } from "@/lib/seo/site-jsonld";
import type {
  HocPhiBlockData,
  HocPhiGoiRow,
  KhoaHocDetailData,
  KhoaHocReviewStats,
} from "@/types/khoa-hoc";

function absoluteUrl(url: string | null | undefined): string | undefined {
  const u = url?.trim();
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  return `${SITE_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;
}

/** Giá sau giảm — cùng công thức `HocPhiBlock` / `hocPhiGoiEffectivePrice`. */
function hocPhiGoiEffectivePrice(g: HocPhiGoiRow): number {
  const d = Math.min(100, Math.max(0, g.discount));
  return Math.round((g.gia_goc * (100 - d)) / 100);
}

function courseDescriptionPlain(detail: KhoaHocDetailData): string {
  const fromIntro = stripHtmlToPlain(detail.gioiThieuMonHocHtml, 5000);
  if (fromIntro.trim()) return fromIntro.trim();
  const sub = detail.tinhChat?.trim();
  if (sub) return sub;
  return detail.tenMonHoc.trim() || "Khóa học tại Sine Art";
}

function collectDetailOfferSchemas(
  detail: KhoaHocDetailData,
  hocPhiBlock: HocPhiBlockData | null,
): Record<string, unknown>[] | undefined {
  const ten = detail.tenMonHoc.trim();
  const baseUrl = `${SITE_ORIGIN}/donghocphi?monId=${detail.id}&course=${encodeURIComponent(ten)}`;
  const offers: Record<string, unknown>[] = [];
  const seenGoiIds = new Set<number>();

  if (hocPhiBlock?.gois?.length) {
    const mon1 = hocPhiBlock.gois.filter(
      (g) => g.mon_hoc === detail.id && !isHocPhiCapTocSpecial(g.special),
    );
    const usePostTitle = mon1.some((g) => (g.post_title ?? "").trim() !== "");
    const rows = usePostTitle
      ? groupMon1ByPostTitle(mon1).flatMap((gr) => gr.pills)
      : dedupeMon1Pills(mon1);

    for (const g of rows) {
      if (seenGoiIds.has(g.id)) continue;
      seenGoiIds.add(g.id);
      const price = hocPhiGoiEffectivePrice(g);
      if (!Number.isFinite(price) || price <= 0) continue;
      const pt = (g.post_title ?? "").trim();
      const dur = `${g.number} ${g.don_vi}`.trim();
      const label = [pt, dur].filter(Boolean).join(" · ") || `Gói ${g.id}`;
      offers.push({
        "@type": "Offer",
        name: `${ten} — ${label}`,
        price: String(price),
        priceCurrency: "VND",
        availability: "https://schema.org/InStock",
        url: baseUrl,
      });
    }
  }

  for (const leg of detail.goiHocPhi) {
    const price = Math.round(Number(leg.hocPhiThucDong));
    if (!Number.isFinite(price) || price <= 0) continue;
    const name = `${ten} — ${leg.tenGoiHocPhi.trim()}`;
    offers.push({
      "@type": "Offer",
      name,
      price: String(price),
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
      url: baseUrl,
    });
  }

  return offers.length > 0 ? offers : undefined;
}

/**
 * JSON-LD `Course` — học phí dạng danh sách `Offer`, có `AggregateRating` khi có dữ liệu.
 */
export function buildKhoaHocDetailCourseJsonLd(
  detail: KhoaHocDetailData,
  slug: string,
  hocPhiBlock: HocPhiBlockData | null,
  reviewStats: KhoaHocReviewStats,
): Record<string, unknown> {
  const courseUrl = `${SITE_ORIGIN}/khoa-hoc/${encodeURIComponent(slug)}`;
  const desc = courseDescriptionPlain(detail);
  const img = absoluteUrl(detail.thumbnail);
  const name = `Khóa học ${detail.tenMonHoc.trim()}`;
  const offerList = collectDetailOfferSchemas(detail, hocPhiBlock);

  const onsitePlace = {
    "@type": "Place",
    name: "Sine Art",
    address: "67 Tân Sơn Nhì, P.14, Tân Phú, TP.HCM",
  } as const;

  const course: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${courseUrl}#course`,
    name,
    description: desc,
    url: courseUrl,
    inLanguage: "vi-VN",
    availableLanguage: "vi",
    provider: {
      "@type": "EducationalOrganization",
      name: "Sine Art",
      url: SITE_ORIGIN,
    },
  };

  if (img) course.image = img;
  if (offerList) course.offers = offerList;

  if (detail.hinhThucTag === "Online") {
    course.hasCourseInstance = {
      "@type": "CourseInstance",
      courseMode: ["online"],
      inLanguage: "vi",
    };
  } else {
    course.hasCourseInstance = {
      "@type": "CourseInstance",
      courseMode: ["onsite"],
      inLanguage: "vi",
      location: onsitePlace,
    };
  }

  if (reviewStats.count > 0 && reviewStats.avg > 0) {
    course.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewStats.avg.toFixed(1),
      reviewCount: String(reviewStats.count),
      bestRating: "5",
      worstRating: "1",
    };
  }

  return course;
}

export function buildKhoaHocDetailFaqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: KHOA_HOC_COURSE_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

export function buildKhoaHocDetailBreadcrumbJsonLd(
  detail: KhoaHocDetailData,
  slug: string,
): Record<string, unknown> {
  const courseUrl = `${SITE_ORIGIN}/khoa-hoc/${encodeURIComponent(slug)}`;
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
  };
}
