import type { KhoaHocCourseCard } from "@/types/khoa-hoc";

import { SITE_ORIGIN } from "@/lib/seo/site-jsonld";

const ORG_REF = { "@id": `${SITE_ORIGIN}/#organization` as const };

const CATALOG_PAGE_ID = `${SITE_ORIGIN}/khoa-hoc#webpage`;
const ITEMLIST_ID = `${SITE_ORIGIN}/khoa-hoc#course-list`;

function absoluteUrl(url: string | null | undefined): string | undefined {
  const u = url?.trim();
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  return `${SITE_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;
}

function courseDescription(c: KhoaHocCourseCard): string | undefined {
  const modality = [c.hinhThucTag, c.hinhThucNavLabel?.trim()].filter(Boolean);
  const modalityStr = modality.length ? [...new Set(modality)].join(" · ") : "";
  const detail = [c.tinhChat?.trim(), c.loaiKhoaHoc?.trim()].filter(Boolean).join(" · ").trim();
  const parts = [modalityStr, detail].filter(Boolean);
  const s = parts.join(modalityStr && detail ? " — " : "").trim() || detail || modalityStr;
  if (!s) return undefined;
  return s.length > 320 ? `${s.slice(0, 317)}…` : s;
}

/**
 * JSON-LD `@graph`: CollectionPage + ItemList (`Course`) + BreadcrumbList.
 * `provider` trỏ `#organization` (JSON-LD layout).
 */
export function buildKhoaHocCatalogJsonLd(courses: KhoaHocCourseCard[]): Record<string, unknown> {
  const catalogTitle = "Các khóa học vẽ mỹ thuật tại Sine Art";
  const catalogDesc =
    "7 khóa học mỹ thuật tại TP.HCM — Hình họa, Bố cục màu, Trang trí màu, Digital Art, Luyện thi tại lớp. Online & tại lớp. Lớp mới khai giảng hàng tuần.";

  const itemListElement = courses.map((c, index) => {
    const courseUrl = `${SITE_ORIGIN}/khoa-hoc/${encodeURIComponent(c.slug)}`;
    const desc = courseDescription(c);

    const coursePayload: Record<string, unknown> = {
      "@type": "Course",
      "@id": `${courseUrl}#course`,
      name: c.tenMonHoc.trim() || "Khóa học",
      url: courseUrl,
      inLanguage: "vi-VN",
      availableLanguage: "vi",
      provider: ORG_REF,
    };

    if (desc) coursePayload.description = desc;

    const img = absoluteUrl(c.thumbnail);
    if (img) coursePayload.image = img;

    return {
      "@type": "ListItem",
      position: index + 1,
      url: courseUrl,
      name: c.tenMonHoc.trim(),
      item: coursePayload,
    };
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": CATALOG_PAGE_ID,
        url: `${SITE_ORIGIN}/khoa-hoc`,
        name: catalogTitle,
        description: catalogDesc,
        publisher: ORG_REF,
        breadcrumb: { "@id": `${SITE_ORIGIN}/khoa-hoc#breadcrumb` },
        mainEntity: { "@id": ITEMLIST_ID },
        about: ORG_REF,
        inLanguage: "vi-VN",
      },
      {
        "@type": "ItemList",
        "@id": ITEMLIST_ID,
        name: catalogTitle,
        description: catalogDesc,
        numberOfItems: courses.length,
        itemListOrder: "https://schema.org/ItemListUnordered",
        publisher: ORG_REF,
        itemListElement,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_ORIGIN}/khoa-hoc#breadcrumb`,
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
        ],
      },
    ],
  };
}
