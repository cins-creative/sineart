/** Cùng nguồn với chân trang (CtaSection) — cập nhật một chỗ khi đổi thông tin liên hệ. */
export const SITE_ORIGIN = "https://sineart.vn" as const;

export const SITE_SOCIAL = {
  facebook: "https://www.facebook.com/sineart0102",
  youtube: "https://www.youtube.com/@MythuatSineArt",
  tiktok: "https://www.tiktok.com/@sineart.official",
} as const;

/** Logo thương hiệu (Cloudflare Images) — đồng bộ CtaSection / SeoOrganizationJsonLd. */
export const SITE_LOGO_URL =
  "https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/65b0e187-cbc0-42f6-4978-b3da96efe300/public" as const;

/**
 * Ảnh mặc định Open Graph / Twitter (hero trang chủ — Cloudflare Images).
 * Dùng trong `layout.tsx` metadata; cập nhật khi đổi ảnh marketing.
 */
export const SITE_OG_DEFAULT_IMAGE =
  "https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/7c0ded50-01b1-4680-31d6-19a7394a7300/public" as const;

const ORG_ID = `${SITE_ORIGIN}/#organization` as const;
const WEB_ID = `${SITE_ORIGIN}/#website` as const;
const PAGE_ID = `${SITE_ORIGIN}/#webpage` as const;
const BREADCRUMB_HOME_ID = `${SITE_ORIGIN}/#breadcrumb-home` as const;

const SITE_DESCRIPTION =
  "Sine Art là trường dạy vẽ mỹ thuật tại TP.HCM — hình họa, bố cục màu, trang trí màu, luyện thi kiến trúc và đại học mỹ thuật cho học sinh THPT.";

const ORG_DESCRIPTION_SHORT =
  "Trung tâm luyện thi vẽ mỹ thuật tại TP.HCM — hình họa, bố cục màu, trang trí màu, digital art, luyện thi kiến trúc và đại học.";

const HOME_TITLE = "Sine Art – Trường vẽ mỹ thuật nền tảng tại TP.HCM";

/** Cập nhật định kỳ theo dữ liệu thực tế / Google Business (tóm tắt đánh giá). */
const AGGREGATE_RATING = {
  "@type": "AggregateRating",
  ratingValue: 4.9,
  reviewCount: 721,
  bestRating: 5,
  worstRating: 1,
} as const;

/**
 * JSON-LD EducationalOrganization + LocalBusiness — toàn site (`layout`).
 * `@id` thống nhất để WebSite / WebPage / Course tham chiếu.
 */
export function getOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@id": ORG_ID,
    "@type": ["EducationalOrganization", "LocalBusiness"],
    name: "Sine Art",
    alternateName: ["SineArt", "Trường vẽ Sine Art"],
    url: SITE_ORIGIN,
    logo: {
      "@type": "ImageObject",
      url: SITE_LOGO_URL,
    },
    image: SITE_OG_DEFAULT_IMAGE,
    description: ORG_DESCRIPTION_SHORT,
    slogan: "Luyện thi vẽ mỹ thuật — hình họa, bố cục màu, luyện thi kiến trúc tại TP.HCM",
    knowsAbout: [
      "Mỹ thuật",
      "Hình họa",
      "Bố cục màu",
      "Trang trí màu",
      "Luyện thi đại học kiến trúc",
      "Luyện thi đại học mỹ thuật",
      "Vẽ đầu tượng",
      "Graphic design",
    ],
    address: [
      {
        "@type": "PostalAddress",
        streetAddress: "67 Tân Sơn Nhì, P.14",
        addressLocality: "Quận Tân Phú",
        addressRegion: "TP.HCM",
        addressCountry: "VN",
      },
      {
        "@type": "PostalAddress",
        streetAddress: "131 Nơ Trang Long",
        addressLocality: "Quận Bình Thạnh",
        addressRegion: "TP.HCM",
        addressCountry: "VN",
      },
    ],
    location: [
      {
        "@type": "Place",
        name: "Sine Art — CS1 Tân Phú",
        address: {
          "@type": "PostalAddress",
          streetAddress: "67 Tân Sơn Nhì, P.14, Quận Tân Phú",
          addressLocality: "TP.HCM",
          addressCountry: "VN",
        },
      },
      {
        "@type": "Place",
        name: "Sine Art — CS2 Bình Thạnh",
        address: {
          "@type": "PostalAddress",
          streetAddress: "131 Nơ Trang Long",
          addressLocality: "Quận Bình Thạnh",
          addressRegion: "TP.HCM",
          addressCountry: "VN",
        },
      },
    ],
    areaServed: {
      "@type": "City",
      name: "Thành phố Hồ Chí Minh",
      containedInPlace: { "@type": "Country", name: "Vietnam" },
    },
    telephone: "+84867551531",
    email: "sineart.official@gmail.com",
    sameAs: [SITE_SOCIAL.facebook, SITE_SOCIAL.youtube, SITE_SOCIAL.tiktok],
    aggregateRating: AGGREGATE_RATING,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+84867551531",
      email: "sineart.official@gmail.com",
      contactType: "customer support",
      availableLanguage: ["Vietnamese", "vi"],
      areaServed: "VN",
    },
  };
}

/** WebSite + SearchAction (sitelinks search box) — trang chủ. */
export function getHomeWebSiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEB_ID,
    name: "Sine Art",
    url: `${SITE_ORIGIN}/`,
    description: SITE_DESCRIPTION,
    inLanguage: "vi-VN",
    publisher: { "@id": ORG_ID },
    copyrightHolder: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_ORIGIN}/blogs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** WebPage trang chủ — liên kết WebSite + Organization. */
export function getHomeWebPageJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": PAGE_ID,
    url: `${SITE_ORIGIN}/`,
    name: HOME_TITLE,
    description: SITE_DESCRIPTION,
    isPartOf: { "@id": WEB_ID },
    about: { "@id": ORG_ID },
    mainEntity: { "@id": ORG_ID },
    inLanguage: "vi-VN",
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: SITE_OG_DEFAULT_IMAGE,
      width: 1200,
      height: 630,
    },
    isFamilyFriendly: true,
  };
}

/** BreadcrumbList — trang chủ (một cấp). */
export function getHomeBreadcrumbListJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": BREADCRUMB_HOME_ID,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: SITE_ORIGIN,
      },
    ],
  };
}
