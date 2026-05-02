import { Skeleton } from "@/components/ui/Skeleton";

import "../../phong-hoc-ui.css";

/** Skeleton segment phòng học — khớp topbar + main + sidebar (ink 6% + shimmer trong globals). */
export function PhongHocClassroomSkeleton() {
  return (
    <div className="phc" aria-busy="true" aria-label="Đang tải phòng học">
      <header className="topbar">
        <div className="topbar-brand">
          <Skeleton className="h-9 w-9 shrink-0 rounded-[12px]" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-16 rounded-[999px]" />
            <Skeleton className="h-5 w-[min(200px,42vw)] rounded-[12px]" />
          </div>
        </div>
        <div className="topbar-tools">
          <Skeleton className="h-[34px] w-[146px] rounded-[999px]" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-[12px]" />
        </div>
        <div className="topbar-spacer" aria-hidden />
        <Skeleton className="h-10 w-36 shrink-0 rounded-[999px]" />
      </header>

      <div className="main">
        <div className="canvas-wrap">
          <Skeleton className="min-h-[min(52vh,420px)] w-full flex-1 rounded-[16px]" />
        </div>
        <aside className="sb gap-3 p-3">
          <Skeleton className="h-9 w-full rounded-[12px]" />
          <Skeleton className="h-24 w-full rounded-[16px]" />
          <Skeleton className="min-h-[140px] w-full flex-1 rounded-[16px]" />
        </aside>
      </div>
    </div>
  );
}
