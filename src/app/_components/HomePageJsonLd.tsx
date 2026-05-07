import { getHomePageJsonLdGraph } from "@/lib/seo/site-jsonld";

/** JSON-LD WebSite + WebPage (`@graph`) — chỉ render trên `/`. Bổ sung cho EducationalOrganization ở layout. */
export default function HomePageJsonLd() {
  const payload = getHomePageJsonLdGraph();
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
