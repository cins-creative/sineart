import { getOrganizationJsonLd } from "@/lib/seo/site-jsonld";

/** JSON-LD EducationalOrganization — toàn site; có `@id` để trang chủ tham chiếu trong `@graph`. */
export default function SeoOrganizationJsonLd() {
  const org = getOrganizationJsonLd();
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
  );
}
