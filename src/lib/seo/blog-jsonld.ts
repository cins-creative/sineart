import {
  buildBlogSlug,
  sourceDomain,
  type BlogListItem,
  type MktBlog,
} from "@/lib/data/blog";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import { SITE_LOGO_URL, SITE_ORIGIN } from "@/lib/seo/site-jsonld";

const ORG_REF = { "@id": `${SITE_ORIGIN}/#organization` as const };

const CATALOG_ROOT = `${SITE_ORIGIN}/blogs`;

const CATALOG_TITLE = "Blog mỹ thuật – Kiến thức học vẽ | Sine Art";
const CATALOG_DESC =
  "Bài viết về kỹ thuật vẽ, kinh nghiệm luyện thi mỹ thuật và hành trình học viên tại Sine Art.";

function catalogAbsoluteUrl(page: number, search: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (search.trim()) params.set("q", search.trim());
  const qs = params.toString();
  return qs ? `${CATALOG_ROOT}?${qs}` : CATALOG_ROOT;
}

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

function wordCountHtml(...parts: (string | null | undefined)[]): number | undefined {
  const joined = parts.filter(Boolean).join(" ");
  const plain = stripHtmlToPlain(joined, undefined);
  const words = plain.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 ? words.length : undefined;
}

function detailDescription(post: MktBlog): string {
  const fromOpen = excerptPlain(post.opening, 600);
  if (fromOpen) return fromOpen;
  const fromBody = excerptPlain(post.content, 400);
  if (fromBody) return fromBody;
  const fromEnd = excerptPlain(post.ending, 400);
  if (fromEnd) return fromEnd;
  return `${post.title?.trim() || "Bài viết"} — Blog mỹ thuật tại Sine Art.`;
}

/**
 * `/blogs` — CollectionPage + ItemList (theo trang hiện tại) + BreadcrumbList.
 */
export function buildBlogCatalogJsonLd(
  posts: BlogListItem[],
  opts: { page: number; search: string }
): Record<string, unknown> {
  const catalogPageUrl = catalogAbsoluteUrl(opts.page, opts.search);

  const itemListElement = posts.map((post, index) => {
    const slug = buildBlogSlug(post.id, post.title);
    const url = `${SITE_ORIGIN}/blogs/${encodeURIComponent(slug)}`;
    const section = sourceDomain(post.nguon);

    const article: Record<string, unknown> = {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: post.title?.trim() || "Bài viết",
      url,
      inLanguage: "vi-VN",
      author: ORG_REF,
      publisher: ORG_REF,
      isAccessibleForFree: true,
    };

    const desc = excerptPlain(post.opening, 280);
    if (desc) article.description = desc;

    const img = thumbUrl(post.thumbnail);
    if (img) article.image = [img];

    const pub = toIso8601(post.created_at);
    if (pub) article.datePublished = pub;

    article.articleSection = section;
    article.keywords = section;

    return {
      "@type": "ListItem",
      position: index + 1,
      url,
      name: post.title?.trim() || "Bài viết",
      item: article,
    };
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${catalogPageUrl}#webpage`,
        url: catalogPageUrl,
        name: CATALOG_TITLE,
        description: CATALOG_DESC,
        inLanguage: "vi-VN",
        publisher: ORG_REF,
        breadcrumb: { "@id": `${catalogPageUrl}#breadcrumb` },
        mainEntity: { "@id": `${catalogPageUrl}#itemlist` },
        about: ORG_REF,
      },
      {
        "@type": "ItemList",
        "@id": `${catalogPageUrl}#itemlist`,
        name: CATALOG_TITLE,
        description: CATALOG_DESC,
        numberOfItems: itemListElement.length,
        itemListOrder: "https://schema.org/ItemListUnordered",
        publisher: ORG_REF,
        itemListElement,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${catalogPageUrl}#breadcrumb`,
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
            name: "Blog",
            item: CATALOG_ROOT,
          },
        ],
      },
    ],
  };
}

export type BlogDetailJsonLdContext = {
  readMin: number;
};

/**
 * `/blogs/[slug]` — WebPage + Article + BreadcrumbList.
 */
export function buildBlogDetailJsonLd(
  post: MktBlog,
  ctx: BlogDetailJsonLdContext
): Record<string, unknown> | null {
  const slug = buildBlogSlug(post.id, post.title)?.trim();
  if (!slug) return null;

  const pageUrl = `${SITE_ORIGIN}/blogs/${encodeURIComponent(slug)}`;
  const desc = detailDescription(post);
  const img = thumbUrl(post.thumbnail);
  const published = toIso8601(post.created_at);
  const wc = wordCountHtml(post.opening, post.content, post.ending);
  const readMin = Math.max(1, ctx.readMin);
  const section = sourceDomain(post.nguon);

  const webpageId = `${pageUrl}#webpage`;
  const articleId = `${pageUrl}#article`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  const publisherOrg = {
    "@type": "Organization",
    name: "Sine Art",
    url: SITE_ORIGIN,
    logo: {
      "@type": "ImageObject",
      url: SITE_LOGO_URL,
    },
  } as const;

  const article: Record<string, unknown> = {
    "@type": "BlogPosting",
    "@id": articleId,
    headline: post.title?.trim() || "Bài viết",
    description: desc,
    url: pageUrl,
    inLanguage: "vi-VN",
    author: { "@type": "Organization", name: "Sine Art", url: SITE_ORIGIN },
    publisher: publisherOrg,
    copyrightHolder: ORG_REF,
    isAccessibleForFree: true,
    mainEntityOfPage: { "@id": webpageId },
    timeRequired: `PT${readMin}M`,
    articleSection: section,
    keywords: section,
  };

  if (img) article.image = [img];

  if (published) {
    article.datePublished = published;
    article.dateModified = published;
  }

  if (wc != null && wc > 0) article.wordCount = wc;

  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": webpageId,
    url: pageUrl,
    name: post.title?.trim() || "Bài viết",
    description: desc,
    inLanguage: "vi-VN",
    publisher: ORG_REF,
    breadcrumb: { "@id": breadcrumbId },
    mainEntity: { "@id": articleId },
  };

  if (published) {
    webPage.datePublished = published;
    webPage.dateModified = published;
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
      name: "Blog",
      item: CATALOG_ROOT,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: post.title?.trim() || "Bài viết",
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
