import { buildEbookHref } from "@/lib/data/ebook-shared";
import type { EbookItem } from "@/lib/data/ebook-shared";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import { SITE_ORIGIN } from "@/lib/seo/site-jsonld";

const ORG_REF = { "@id": `${SITE_ORIGIN}/#organization` as const };

const EBOOK_FORMAT = "https://schema.org/EBook";
const CATALOG_URL = `${SITE_ORIGIN}/ebook`;

const CATALOG_TITLE = "Free ebook mỹ thuật — Sine Art Library";
const CATALOG_DESC =
  "Thư viện ebook mỹ thuật miễn phí: lịch sử mỹ thuật, giải phẫu, phối cảnh, trang trí, hoạt hình… tuyển chọn & biên soạn bởi Sine Art.";

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

function bookDescription(e: EbookItem, maxLen: number): string {
  const plain = stripHtmlToPlain(e.content, maxLen);
  if (plain.trim()) return plain.trim();
  return `${e.title} — Ebook mỹ thuật miễn phí tại Sine Art Library.`;
}

/** Offer miễn phí — khớp positioning «free ebook». */
function freeOffer(pageUrl: string): Record<string, unknown> {
  return {
    "@type": "Offer",
    url: pageUrl,
    price: 0,
    priceCurrency: "VND",
    availability: "https://schema.org/InStock",
    description: "Đọc miễn phí trên Sine Art Library.",
  };
}

function wordCount(html: string | null | undefined): number | undefined {
  const plain = stripHtmlToPlain(html ?? "", undefined);
  const words = plain.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 ? words.length : undefined;
}

/**
 * `/ebook` — CollectionPage + ItemList (Book / EBook) + BreadcrumbList.
 */
export function buildEbookCatalogJsonLd(items: EbookItem[]): Record<string, unknown> {
  const withSlug = items.filter((it) => it.slug?.trim());
  const itemListElement = withSlug.map((e, index) => {
    const path = buildEbookHref(e.slug);
    const url = `${SITE_ORIGIN}${path}`;
    const book: Record<string, unknown> = {
      "@type": "Book",
      "@id": `${url}#book`,
      name: e.title.trim(),
      url,
      bookFormat: EBOOK_FORMAT,
      inLanguage: "vi-VN",
      author: ORG_REF,
      publisher: ORG_REF,
      isAccessibleForFree: true,
      offers: freeOffer(url),
    };

    const img = thumbUrl(e.thumbnail);
    if (img) book.image = img;

    const pub = toIso8601(e.created_at);
    if (pub) book.datePublished = pub;

    if (e.categories.length) book.genre = e.categories.join(", ");

    if (e.pages != null && Number.isFinite(e.pages) && e.pages > 0) {
      book.numberOfPages = Math.round(Number(e.pages));
    }

    const desc = bookDescription(e, 280);
    if (desc) book.description = desc;

    return {
      "@type": "ListItem",
      position: index + 1,
      url,
      name: e.title.trim(),
      item: book,
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
            name: "Ebook mỹ thuật",
            item: CATALOG_URL,
          },
        ],
      },
    ],
  };
}

/**
 * `/ebook/[slug]` — WebPage + Book + BreadcrumbList.
 */
export function buildEbookDetailJsonLd(ebook: EbookItem): Record<string, unknown> | null {
  const slug = ebook.slug?.trim();
  if (!slug) return null;

  const path = buildEbookHref(slug);
  const pageUrl = `${SITE_ORIGIN}${path}`;
  const desc = bookDescription(ebook, 600);
  const img = thumbUrl(ebook.thumbnail);
  const published = toIso8601(ebook.created_at);
  const modified = toIso8601(ebook.updated_at ?? ebook.created_at) ?? published;
  const wcContent = wordCount(ebook.content);
  const wcDetail = wordCount(ebook.noi_dung_sach);
  const wc =
    wcContent != null || wcDetail != null ? (wcContent ?? 0) + (wcDetail ?? 0) : undefined;

  const webpageId = `${pageUrl}#webpage`;
  const bookId = `${pageUrl}#book`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  const book: Record<string, unknown> = {
    "@type": "Book",
    "@id": bookId,
    name: ebook.title.trim(),
    description: desc,
    url: pageUrl,
    bookFormat: EBOOK_FORMAT,
    inLanguage: "vi-VN",
    author: ORG_REF,
    publisher: ORG_REF,
    copyrightHolder: ORG_REF,
    isAccessibleForFree: true,
    offers: freeOffer(pageUrl),
    mainEntityOfPage: { "@id": webpageId },
  };

  if (img) book.image = img;

  if (published) {
    book.datePublished = published;
    book.dateModified = modified ?? published;
  }

  if (ebook.categories.length) {
    book.genre = ebook.categories.join(", ");
    book.keywords = ebook.categories.join(", ");
  }

  if (ebook.pages != null && Number.isFinite(ebook.pages) && ebook.pages > 0) {
    book.numberOfPages = Math.round(Number(ebook.pages));
  }

  if (wc != null && wc > 0) book.wordCount = wc;

  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": webpageId,
    url: pageUrl,
    name: ebook.title.trim(),
    description: desc,
    inLanguage: "vi-VN",
    publisher: ORG_REF,
    breadcrumb: { "@id": breadcrumbId },
    mainEntity: { "@id": bookId },
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

  return {
    "@context": "https://schema.org",
    "@graph": [
      webPage,
      book,
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
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
            name: "Ebook mỹ thuật",
            item: CATALOG_URL,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: ebook.title.trim(),
            item: pageUrl,
          },
        ],
      },
    ],
  };
}
