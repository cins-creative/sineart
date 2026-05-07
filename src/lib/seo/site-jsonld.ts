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

const ORG_ID = `${SITE_ORIGIN}/#organization` as const;
const WEB_ID = `${SITE_ORIGIN}/#website` as const;
const PAGE_ID = `${SITE_ORIGIN}/#webpage` as const;

const SITE_DESCRIPTION =
  "Sine Art là trường dạy vẽ mỹ thuật tại TP.HCM — hình họa, bố cục màu, trang trí màu, luyện thi kiến trúc và đại học mỹ thuật cho học sinh THPT.";

const HOME_TITLE = "Sine Art – Trường vẽ mỹ thuật nền tảng tại TP.HCM";

/**
 * JSON-LD EducationalOrganization — dùng toàn site (layout).
 * Có @id để WebSite / WebPage trên trang chủ tham chiếu chéo.
 */
export function getOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@id": ORG_ID,
    "@type": "EducationalOrganization",
    name: "Sine Art",
    alternateName: ["SineArt", "Trường vẽ Sine Art"],
    url: `${SITE_ORIGIN}/`,
    logo: {
      "@type": "ImageObject",
      url: SITE_LOGO_URL,
    },
    description: SITE_DESCRIPTION,
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
    address: {
      "@type": "PostalAddress",
      streetAddress: "67 Tân Sơn Nhì, P.14, Quận Tân Phú",
      addressLocality: "TP.HCM",
      addressCountry: "VN",
    },
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

/**
 * JSON-LD @graph: WebSite + WebPage — chỉ trang chủ; liên kết tới #organization.
 */
export function getHomePageJsonLdGraph(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEB_ID,
        name: "Sine Art",
        url: `${SITE_ORIGIN}/`,
        description: SITE_DESCRIPTION,
        inLanguage: "vi-VN",
        publisher: { "@id": ORG_ID },
        copyrightHolder: { "@id": ORG_ID },
      },
      {
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
          url: SITE_LOGO_URL,
        },
        isFamilyFriendly: true,
      },
    ],
  };
}
