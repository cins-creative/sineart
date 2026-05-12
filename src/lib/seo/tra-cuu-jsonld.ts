import { traCuuTypeLabel } from "@/lib/data/tra-cuu-shared";
import type { TraCuuDetail, TraCuuListItem } from "@/lib/data/tra-cuu-shared";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import { SITE_LOGO_URL, SITE_ORIGIN } from "@/lib/seo/site-jsonld";

const CATALOG_URL = `${SITE_ORIGIN}/tra-cuu-thong-tin`;

/** Mô tả ngắn JSON-LD listing — đồng bộ messaging với metadata. */
export const TRA_CUU_LISTING_DESC_SHORT =
  "Bài tra cứu tuyển sinh mỹ thuật — điểm chuẩn, phương thức xét tuyển, kinh nghiệm thi từ nhiều trường đại học";

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

function thumbUrl(url: string | null | undefined): string | undefined {
  const raw = url?.trim();
  if (!raw) return undefined;
  return cfImageForThumbnail(raw) ?? raw;
}

function excerptPlain(html: string | null | undefined, maxLen: number): string | undefined {
  const ex = html?.trim();
  if (!ex) return undefined;
  const p = stripHtmlToPlain(ex, maxLen);
  return p.trim() || undefined;
}

export function traCuuDetailDescription(post: TraCuuDetail): string {
  const fromEx = excerptPlain(post.excerpt, 800);
  if (fromEx) return fromEx;
  const fromBody = excerptPlain(post.body_html, 400);
  if (fromBody) return fromBody;
  return `${post.title?.trim() || "Tra cứu"} — Thông tin tuyển sinh đại học mỹ thuật tại Sine Art.`;
}

function typeKeywordsJoined(post: TraCuuListItem): string | undefined {
  if (!post.type.length) return undefined;
  return post.type.map((t) => traCuuTypeLabel(t)).join(", ");
}

function detailImageUrls(post: TraCuuDetail): string[] {
  const urls: string[] = [];
  const t = thumbUrl(post.thumbnail_url);
  if (t) urls.push(t);
  for (const raw of post.album) {
    const u = thumbUrl(raw);
    if (u && !urls.includes(u)) urls.push(u);
    if (urls.length >= 8) break;
  }
  return urls;
}

export function isTraCuuDiemChuan(post: TraCuuListItem): boolean {
  return post.type.includes("diem-chuan");
}

/**
 * `/tra-cuu-thong-tin` — `CollectionPage` (một script JSON-LD).
 */
export function buildTraCuuListingCollectionJsonLd(
  numberOfItems: number,
): Record<string, unknown> {
  const description =
    numberOfItems > 0
      ? `${numberOfItems} bài tra cứu thông tin tuyển sinh — điểm chuẩn, phương thức xét tuyển, kinh nghiệm thi từ 15+ trường đại học`
      : TRA_CUU_LISTING_DESC_SHORT;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tra cứu thông tin thi đại học mỹ thuật — Sine Art",
    description,
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

/** Breadcrumb listing — mục 2: «Thông tin đại học». */
export function buildTraCuuListingBreadcrumbJsonLd(): Record<string, unknown> {
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
        name: "Thông tin đại học",
        item: CATALOG_URL,
      },
    ],
  };
}

const SINE_ART_ORG: Record<string, unknown> = {
  "@type": "Organization",
  name: "Sine Art",
  url: SITE_ORIGIN,
  logo: {
    "@type": "ImageObject",
    url: SITE_LOGO_URL,
  },
};

export type TraCuuDetailJsonLdContext = {
  readMin: number;
  truongNames: string[];
};

/**
 * `/tra-cuu-thong-tin/[slug]` — `Article` độc lập (một script).
 */
export function buildTraCuuDetailArticleJsonLd(
  post: TraCuuDetail,
  ctx: TraCuuDetailJsonLdContext,
): Record<string, unknown> | null {
  const slug = post.slug?.trim();
  if (!slug) return null;

  const pageUrl = `${SITE_ORIGIN}/tra-cuu-thong-tin/${encodeURIComponent(slug)}`;
  const desc = traCuuDetailDescription(post);
  const images = detailImageUrls(post);
  const published = toIso8601(post.published_at);
  const modified = toIso8601(post.updated_at ?? post.published_at) ?? published;
  const readMin = Math.max(1, ctx.readMin);
  const tk = typeKeywordsJoined(post);
  const kwParts = [
    ...ctx.truongNames,
    ...post.type.map((t) => traCuuTypeLabel(t)),
    ...(post.nam != null ? [`Năm ${post.nam}`] : []),
  ].filter(Boolean);
  const keywordsJoined = kwParts.length ? kwParts.join(", ") : undefined;
  const aboutName =
    ctx.truongNames[0]?.trim() ?? "Tuyển sinh đại học mỹ thuật Việt Nam";

  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title?.trim() || "Tra cứu thông tin",
    description: desc,
    url: pageUrl,
    inLanguage: "vi",
    author: SINE_ART_ORG,
    publisher: SINE_ART_ORG,
    isAccessibleForFree: true,
    timeRequired: `PT${readMin}M`,
    isPartOf: {
      "@type": "CollectionPage",
      name: "Tra cứu thông tin thi đại học mỹ thuật",
      url: CATALOG_URL,
    },
    about: { "@type": "Thing", name: aboutName },
  };

  if (images.length) article.image = images;
  if (published) {
    article.datePublished = published;
    article.dateModified = modified ?? published;
  }
  if (tk) article.articleSection = tk;
  if (keywordsJoined) article.keywords = keywordsJoined;

  return article;
}

/**
 * `Dataset` — chỉ bài loại điểm chuẩn (dữ liệu bảng có cấu trúc).
 */
export function buildTraCuuDetailDatasetJsonLd(
  post: TraCuuDetail,
  truongNames: string[],
): Record<string, unknown> | null {
  if (!isTraCuuDiemChuan(post)) return null;
  const slug = post.slug?.trim();
  if (!slug) return null;

  const pageUrl = `${SITE_ORIGIN}/tra-cuu-thong-tin/${encodeURIComponent(slug)}`;
  const desc = traCuuDetailDescription(post);
  const published = toSchemaDate(post.published_at);
  const modified = toSchemaDate(post.updated_at ?? post.published_at) ?? published;
  const truongLabel =
    truongNames[0]?.trim() ?? "các trường đại học mỹ thuật Việt Nam";
  const yearPart = post.nam != null ? `năm ${post.nam}` : "";

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: post.title?.trim() || "Điểm chuẩn",
    description: `Bảng điểm chuẩn ${yearPart ? `${yearPart} ` : ""}— ${truongLabel}.`,
    url: pageUrl,
    inLanguage: "vi",
    creator: SINE_ART_ORG,
    keywords: ["điểm chuẩn", truongLabel, ...(post.nam != null ? [String(post.nam)] : [])].join(
      ", ",
    ),
    variableMeasured: "Điểm chuẩn xét tuyển đại học",
    temporalCoverage: post.nam != null ? String(post.nam) : undefined,
    ...(published && {
      datePublished: published,
      dateModified: modified ?? published,
    }),
  };
}

export function buildTraCuuDetailBreadcrumbJsonLd(post: TraCuuDetail): Record<string, unknown> | null {
  const slug = post.slug?.trim();
  if (!slug) return null;

  const pageUrl = `${SITE_ORIGIN}/tra-cuu-thong-tin/${encodeURIComponent(slug)}`;

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
        name: "Thông tin đại học",
        item: CATALOG_URL,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title?.trim() || "Bài tra cứu",
        item: pageUrl,
      },
    ],
  };
}
