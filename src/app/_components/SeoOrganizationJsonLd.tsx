const ORG = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Sine Art",
  url: "https://sineart.vn",
  /** Ảnh logo thương hiệu (Cloudflare Images) — dùng khi chưa có /public/logo.png. */
  logo: "https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/65b0e187-cbc0-42f6-4978-b3da96efe300/public",
  address: {
    "@type": "PostalAddress",
    addressLocality: "TP.HCM",
    addressCountry: "VN",
  },
} as const;

/** JSON-LD Organization — không đổi giao diện; chỉ inject script trong DOM. */
export default function SeoOrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG) }}
    />
  );
}
