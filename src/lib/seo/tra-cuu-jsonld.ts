import { traCuuTypeLabel } from "@/lib/data/tra-cuu-shared";
import type { TraCuuDetail, TraCuuListItem } from "@/lib/data/tra-cuu-shared";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import { SITE_ORIGIN } from "@/lib/seo/site-jsonld";

const ORG_REF = { "@id": `${SITE_ORIGIN}/#organization` as const };

const CATALOG_URL = `${SITE_ORIGIN}/tra-cuu-thong-tin`;

const CATALOG_TITLE = "Tra cứu thông tin thi đại học mỹ thuật | Sine Art";
const CATALOG_DESC =
  "Điểm chuẩn, phương thức xét tuyển, cách tính điểm, chương trình học và kinh nghiệm thi từ các trường đại học đối tác — cập nhật bởi Sine Art.";

function toIso8601(isoLike: string | null | undefined): string | undefined {
  if (!isoLike?.trim()) return undefined;
  const d = new Date(isoLike.trim());
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
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

function wordCount(html: string | null | undefined): number | undefined {
  const plain = stripHtmlToPlain(html ?? "", undefined);
  const words = plain.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 ? words.length : undefined;
}

function typeKeywords(post: TraCuuListItem): string | undefined {
  if (!post.type.length) return undefined;
  return post.type.map((t) => traCuuTypeLabel(t)).join(", ");
}

/**
 * `/tra-cuu-thong-tin` — CollectionPage + ItemList (Article) + BreadcrumbList.
 */
export function buildTraCuuCatalogJsonLd(items: TraCuuListItem[]): Record<string, unknown> {
  const filtered = items.filter((it) => it.slug?.trim());
  const itemListElement = filtered.map((it, index) => {
    const url = `${SITE_ORIGIN}/tra-cuu-thong-tin/${encodeURIComponent(it.slug!)}`;
    const article: Record<string, unknown> = {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: it.title?.trim() || "Tra cứu thông tin",
      url,
      inLanguage: "vi-VN",
      author: ORG_REF,
      publisher: ORG_REF,
      isAccessibleForFree: true,
    };

    const desc = excerptPlain(it.excerpt, 280);
    if (desc) article.description = desc;

    const img = thumbUrl(it.thumbnail_url);
    if (img) article.image = [img];

    const pub = toIso8601(it.published_at);
    if (pub) article.datePublished = pub;

    const tk = typeKeywords(it);
    if (tk) {
      article.articleSection = tk;
      article.keywords = tk;
    }

    return {
      "@type": "ListItem",
      position: index + 1,
      url,
      name: it.title?.trim() || "Tra cứu",
      item: article,
    };
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${CATALOG_URL}#webpage`,
        url: CATALOG_URL,
        name: CATALOG_TITLE,
        description: CATALOG_DESC,
        inLanguage: "vi-VN",
        publisher: ORG_REF,
        breadcrumb: { "@id": `${CATALOG_URL}#breadcrumb` },
        mainEntity: { "@id": `${CATALOG_URL}#itemlist` },
        about: ORG_REF,
      },
      {
        "@type": "ItemList",
        "@id": `${CATALOG_URL}#itemlist`,
        name: CATALOG_TITLE,
        description: CATALOG_DESC,
        numberOfItems: itemListElement.length,
        itemListOrder: "https://schema.org/ItemListUnordered",
        publisher: ORG_REF,
        itemListElement,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${CATALOG_URL}#breadcrumb`,
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
            name: "Tra cứu thông tin",
            item: CATALOG_URL,
          },
        ],
      },
    ],
  };
}

function detailDescription(post: TraCuuDetail): string {
  const fromEx = excerptPlain(post.excerpt, 800);
  if (fromEx) return fromEx;
  const fromBody = excerptPlain(post.body_html, 400);
  if (fromBody) return fromBody;
  return `${post.title?.trim() || "Tra cứu"} — Thông tin tuyển sinh đại học mỹ thuật tại Sine Art.`;
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

export type TraCuuDetailJsonLdContext = {
  readMin: number;
  truongNames: string[];
};

/**
 * `/tra-cuu-thong-tin/[slug]` — WebPage + Article + BreadcrumbList.
 */
export function buildTraCuuDetailJsonLd(
  post: TraCuuDetail,
  ctx: TraCuuDetailJsonLdContext
): Record<string, unknown> | null {
  const slug = post.slug?.trim();
  if (!slug) return null;

  const pageUrl = `${SITE_ORIGIN}/tra-cuu-thong-tin/${encodeURIComponent(slug)}`;
  const desc = detailDescription(post);
  const images = detailImageUrls(post);
  const published = toIso8601(post.published_at);
  const modified = toIso8601(post.updated_at ?? post.published_at) ?? published;
  const wc = wordCount(post.body_html ?? post.excerpt);
  const readMin = Math.max(1, ctx.readMin);

  const webpageId = `${pageUrl}#webpage`;
  const articleId = `${pageUrl}#article`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  const tk = typeKeywords(post);
  const kwParts = [
    ...ctx.truongNames,
    ...post.type.map((t) => traCuuTypeLabel(t)),
    ...(post.nam != null ? [`Năm ${post.nam}`] : []),
  ].filter(Boolean);
  const keywordsJoined = kwParts.length ? kwParts.join(", ") : undefined;

  const article: Record<string, unknown> = {
    "@type": "Article",
    "@id": articleId,
    headline: post.title?.trim() || "Tra cứu thông tin",
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

  if (images.length) article.image = images;

  if (published) {
    article.datePublished = published;
    article.dateModified = modified ?? published;
  }

  if (tk) article.articleSection = tk;
  if (keywordsJoined) article.keywords = keywordsJoined;

  if (wc != null && wc > 0) article.wordCount = wc;

  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": webpageId,
    url: pageUrl,
    name: post.title?.trim() || "Tra cứu thông tin",
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

  if (images[0]) {
    webPage.primaryImageOfPage = {
      "@type": "ImageObject",
      url: images[0],
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
      name: "Tra cứu thông tin",
      item: CATALOG_URL,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: post.title?.trim() || "Bài tra cứu",
      item: pageUrl,
    },
  ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      webPage,
      article,
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: crumbs,
      },
    ],
  };
}
