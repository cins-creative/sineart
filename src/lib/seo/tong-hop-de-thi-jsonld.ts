import { buildDeThiHref } from "@/lib/data/de-thi-shared";
import type { DeThiDetail, DeThiListItem } from "@/lib/data/de-thi-shared";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import { SITE_ORIGIN } from "@/lib/seo/site-jsonld";

const ORG_REF = { "@id": `${SITE_ORIGIN}/#organization` as const };

const CATALOG_URL = `${SITE_ORIGIN}/tong-hop-de-thi`;

const CATALOG_TITLE = "Tổng hợp đề thi mỹ thuật — Sine Art";
const CATALOG_DESC =
  "Thư viện đề luyện thi Bố cục màu, Trang trí màu — biên soạn bởi giáo viên Sine Art, cập nhật hàng năm. Có lời giải, OCR đề gốc, filter theo môn · năm · loại mẫu.";

function toIso8601(isoLike: string | null | undefined): string | undefined {
  if (!isoLike?.trim()) return undefined;
  const d = new Date(isoLike.trim());
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function excerptPlain(it: DeThiListItem): string | undefined {
  const ex = it.excerpt?.trim();
  if (!ex) return undefined;
  const plain = stripHtmlToPlain(ex, 280);
  return plain.trim() || undefined;
}

function detailDescription(post: DeThiDetail): string {
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

function wordCount(html: string | null | undefined): number | undefined {
  const plain = stripHtmlToPlain(html ?? "", undefined);
  const words = plain.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 ? words.length : undefined;
}

/**
 * `/tong-hop-de-thi` — CollectionPage + ItemList (Article từng đề) + BreadcrumbList.
 */
export function buildTongHopDeThiCatalogJsonLd(items: DeThiListItem[]): Record<string, unknown> {
  const filtered = items.filter((it) => it.slug?.trim());
  const itemListElement = filtered.map((it, index) => {
    const path = buildDeThiHref(it.slug);
    const url = `${SITE_ORIGIN}${path}`;
    const article: Record<string, unknown> = {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: it.ten?.trim() || "Đề thi",
      url,
      inLanguage: "vi-VN",
      author: ORG_REF,
      publisher: ORG_REF,
      isAccessibleForFree: true,
    };

    const desc = excerptPlain(it);
    if (desc) article.description = desc;

    const img = primaryImage(it.thumbnail_url);
    if (img) article.image = [img];

    const pub = toIso8601(it.created_at);
    if (pub) article.datePublished = pub;

    if (it.mon.length) article.articleSection = it.mon.join(" · ");

    return {
      "@type": "ListItem",
      position: index + 1,
      url,
      name: it.ten?.trim() || "Đề thi",
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
            name: "Tổng hợp đề thi",
            item: CATALOG_URL,
          },
        ],
      },
    ],
  };
}

/**
 * `/tong-hop-de-thi/[slug]` — WebPage + Article + BreadcrumbList.
 */
export function buildTongHopDeThiDetailJsonLd(post: DeThiDetail): Record<string, unknown> | null {
  const slug = post.slug?.trim();
  if (!slug) return null;

  const path = buildDeThiHref(slug);
  const pageUrl = `${SITE_ORIGIN}${path}`;
  const desc = detailDescription(post);
  const img = primaryImage(post.thumbnail_url);
  const published = toIso8601(post.created_at);
  const modified = toIso8601(post.updated_at ?? post.created_at) ?? published;
  const wc = wordCount(post.body_html ?? post.content_raw);

  const webpageId = `${pageUrl}#webpage`;
  const articleId = `${pageUrl}#article`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  const article: Record<string, unknown> = {
    "@type": "Article",
    "@id": articleId,
    headline: post.ten?.trim() || "Đề thi",
    description: desc,
    url: pageUrl,
    inLanguage: "vi-VN",
    author: ORG_REF,
    publisher: ORG_REF,
    copyrightHolder: ORG_REF,
    isAccessibleForFree: true,
    mainEntityOfPage: { "@id": webpageId },
  };

  if (img) article.image = [img];

  if (published) {
    article.datePublished = published;
    article.dateModified = modified ?? published;
  }

  if (post.mon.length) {
    article.articleSection = post.mon.join(" · ");
    article.keywords = [...post.mon, post.nam != null ? `Năm ${post.nam}` : ""]
      .filter(Boolean)
      .join(", ");
  } else if (post.nam != null) {
    article.keywords = `Năm ${post.nam}`;
  }

  if (wc != null) article.wordCount = wc;

  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": webpageId,
    url: pageUrl,
    name: post.ten?.trim() || "Đề thi",
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
      name: "Tổng hợp đề thi",
      item: CATALOG_URL,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: post.ten?.trim() || "Đề thi",
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
