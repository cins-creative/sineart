import SchemaOrg from "@/components/seo/SchemaOrg";
import { getOrganizationJsonLd } from "@/lib/seo/site-jsonld";

/** JSON-LD EducationalOrganization + LocalBusiness — toàn site; `@id` để các schema khác tham chiếu. */
export default function SeoOrganizationJsonLd() {
  return <SchemaOrg schema={getOrganizationJsonLd()} />;
}
