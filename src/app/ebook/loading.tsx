import { EbookCatalogSectionSkeleton } from "./_components/EbookCatalogSection.skeleton";
import { EbookKhoaHocNavSkeleton } from "./_components/EbookKhoaHocNav.skeleton";
import { EbookStyles } from "./EbookStyles";

/** Skeleton segment `/ebook` — Nav + hero + lưới (prefetch transition). */
export default function EbookLoading() {
  return (
    <div className="sa-root sa-ebook">
      <EbookStyles />
      <EbookKhoaHocNavSkeleton />
      <EbookCatalogSectionSkeleton />
    </div>
  );
}
