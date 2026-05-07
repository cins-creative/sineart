import { buildLyThuyetHref } from "@/lib/data/ly-thuyet-shared";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import { SITE_ORIGIN } from "@/lib/seo/site-jsonld";
import type { LyThuyet } from "@/types/ly-thuyet";

const ORG_REF = { "@id": `${SITE_ORIGIN}/#organization` as const };

function toIso8601(isoLike: string | null | undefined): string | undefined {
  if (!isoLike?.trim()) return undefined;
  const d = new Date(isoLike.trim());
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function articleDescription(ly: LyThuyet): string {
  const short = ly.short_content?.trim();
  if (short) return short.length > 500 ? `${short.slice(0, 497)}…` : short;
  const fromBody = stripHtmlToPlain(ly.content, 320);
  if (fromBody.trim()) return fromBody.trim();
  return `${ly.ten} — Thư viện kiến thức nền tảng mỹ thuật Sine Art.`;
}

function primaryImageUrl(ly: LyThuyet): string | undefined {
  const raw = ly.thumbnail?.trim();
  if (!raw) return undefined;
  return cfImageForThumbnail(raw) ?? raw;
}

function wordCount(ly: LyThuyet): number | undefined {
  const plain = stripHtmlToPlain(ly.content ?? ly.short_content ?? "", undefined);
  const words = plain.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 ? words.length : undefined;
}

/**
 * JSON-LD `@graph`: WebPage + Article + BreadcrumbList.
 * Trùng khóa `@id` với layout (`#organization`). Ảnh dùng Cloudflare thumbnail khi có.
 */
export function buildKienThucNenTangArticleJsonLd(ly: LyThuyet): Record<string, unknown> {
  const path = buildLyThuyetHref(ly.slug);
  const pageUrl = `${SITE_ORIGIN}${path}`;
  const desc = articleDescription(ly);
  const img = primaryImageUrl(ly);
  const published = toIso8601(ly.created_at);
  const modified = published;
  const wc = wordCount(ly);
  const readMin = Math.max(1, ly.readingMin);

  const articleId = `${pageUrl}#article`;
  const webpageId = `${pageUrl}#webpage`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  const article: Record<string, unknown> = {
    "@type": "Article",
    "@id": articleId,
    headline: ly.ten,
    description: desc,
    url: pageUrl,
    inLanguage: "vi-VN",
    author: ORG_REF,
    publisher: ORG_REF,
    copyrightHolder: ORG_REF,
    isAccessibleForFree: true,
    mainEntityOfPage: { "@id": webpageId },
    timeRequired: `PT${readMin}M`,
  };

  if (published) {
    article.datePublished = published;
    article.dateModified = modified ?? published;
  }

  if (img) article.image = [img];

  if (ly.nhom) article.articleSection = ly.nhom;

  if (ly.tagList.length) article.keywords = ly.tagList.join(", ");

  if (wc != null) article.wordCount = wc;

  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": webpageId,
    url: pageUrl,
    name: ly.ten,
    description: desc,
    inLanguage: "vi-VN",
    publisher: ORG_REF,
    breadcrumb: { "@id": breadcrumbId },
    mainEntity: { "@id": articleId },
  };

  if (published) {
    webPage.datePublished = published;
    webPage.dateModified = modified ?? published;
  }

  if (img) {
    webPage.primaryImageOfPage = {
      "@type": "ImageObject",
      url: img,
    };
  }

  const crumbs: Array<Record<string, unknown>> = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Trang chủ",
      item: `${SITE_ORIGIN}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Thư viện",
      item: `${SITE_ORIGIN}/kien-thuc-nen-tang`,
    },
  ];

  if (ly.nhom) {
    crumbs.push({
      "@type": "ListItem",
      position: 3,
      name: ly.nhom,
      item: `${SITE_ORIGIN}/kien-thuc-nen-tang`,
    });
  }

  crumbs.push({
    "@type": "ListItem",
    position: crumbs.length + 1,
    name: ly.ten,
    item: pageUrl,
  });

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: crumbs,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [webPage, article, breadcrumb],
  };
}
