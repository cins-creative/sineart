import { Skeleton } from "@/components/ui/Skeleton";
import { NavBarAsyncSkeleton } from "./_components/NavBarAsync.skeleton";
import { LessonBodyAsyncSkeleton } from "./_components/LessonBodyAsync.skeleton";
import "@/app/khoa-hoc/khoa-hoc-detail.css";
import "../he-thong-bai-tap.css";

/**
 * Segment-level loading: hiển thị ngay khi user click `<Link>` sang `/he-thong-bai-tap/[slug]`,
 * trước khi Server Component bắt đầu fetch. Khớp layout `sa-root.khoa-hoc-page.htbt-root > .kd-page`.
 */
export default function Loading() {
  return (
    <>
      <NavBarAsyncSkeleton />
      <div
        className="sa-root khoa-hoc-page htbt-root"
        aria-busy="true"
        aria-label="Đang tải bài tập"
      >
        <div className="kd-page">
          <nav className="kd-bc" aria-hidden>
            <Skeleton className="h-3 w-16 rounded-[6px]" />
            <span className="kd-bc-sep">›</span>
            <Skeleton className="h-3 w-20 rounded-[6px]" />
            <span className="kd-bc-sep">›</span>
            <Skeleton className="h-3 w-28 rounded-[6px]" />
            <span className="kd-bc-sep">›</span>
            <Skeleton className="h-3 w-40 rounded-[6px]" />
          </nav>
          <LessonBodyAsyncSkeleton />
        </div>
      </div>
    </>
  );
}
