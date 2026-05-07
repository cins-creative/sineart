import { buildKhoaHocCatalogJsonLd } from "@/lib/seo/khoa-hoc-catalog-jsonld";
import type { KhoaHocCourseCard } from "@/types/khoa-hoc";

/** JSON-LD CollectionPage + ItemList (`Course`) + BreadcrumbList — `/khoa-hoc`. */
export default function KhoaHocCatalogJsonLd({
  courses,
}: Readonly<{ courses: KhoaHocCourseCard[] }>) {
  const payload = buildKhoaHocCatalogJsonLd(courses);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
