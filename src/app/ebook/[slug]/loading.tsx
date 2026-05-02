import { EbookKhoaHocNavSkeleton } from "../_components/EbookKhoaHocNav.skeleton";
import { EbookDetailStyles } from "./EbookDetailStyles";
import { EbookDetailMainSkeleton } from "./_components/EbookDetailMain.skeleton";

/** Skeleton segment `/ebook/[slug]` — Nav + shell chi tiết. */
export default function EbookDetailLoading() {
  return (
    <div className="sa-root sa-ebook-detail">
      <EbookDetailStyles />
      <EbookKhoaHocNavSkeleton />
      <EbookDetailMainSkeleton />
    </div>
  );
}
