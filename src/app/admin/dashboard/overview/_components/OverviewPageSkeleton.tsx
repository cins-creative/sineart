import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/** Skeleton segment `/admin/dashboard/overview` — tabs + panel (loading.tsx). */
export function OverviewPageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "-m-4 flex h-full min-h-0 flex-col md:-m-6",
        className,
      )}
      aria-busy="true"
      aria-label="Đang tải bảng điều khiển"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-[10px] pb-6 pt-2 md:px-6 md:pb-8 md:pt-3">
        <div className="flex flex-row flex-wrap gap-2 border-b border-black/[0.08] pb-3">
          <Skeleton className="h-11 w-[200px] rounded-xl" />
          <Skeleton className="h-11 w-[140px] rounded-xl" />
        </div>
        <div className="min-h-0 flex-1 space-y-4">
          <div className="flex flex-wrap gap-2 md:gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[88px] min-w-[120px] flex-1 rounded-[14px]" />
            ))}
          </div>
          <Skeleton className="h-[320px] w-full rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}
