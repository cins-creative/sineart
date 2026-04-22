import "../khoa-hoc.css";
import "../khoa-hoc-detail.css";
import { KhoaHocSlugDetailSectionSkeleton } from "./_components/KhoaHocSlugDetailSection.skeleton";
import { KhoaHocSlugNavSectionSkeleton } from "./_components/KhoaHocSlugNavSection.skeleton";

/** Fallback điều hướng `/khoa-hoc/[slug]` — cùng layout với `page.tsx`. */
export default function KhoaHocSlugLoading() {
  return (
    <>
      <KhoaHocSlugNavSectionSkeleton />
      <KhoaHocSlugDetailSectionSkeleton />
    </>
  );
}
