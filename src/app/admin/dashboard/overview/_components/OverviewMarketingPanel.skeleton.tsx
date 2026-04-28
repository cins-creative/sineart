import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/** Khớp layout Marketing: KPI cards + vùng biểu đồ — ink 6% + shimmer peach (globals `.skeleton-base`). */
export function OverviewMarketingPanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("space-y-4 pb-2", className)}
      aria-busy="true"
      aria-label="Đang tải phân tích marketing"
    >
      <div className="flex flex-wrap gap-2 md:gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] min-w-[120px] flex-1 rounded-[14px]" />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] pb-3">
        <Skeleton className="h-9 w-[140px] rounded-xl" />
        <Skeleton className="h-9 w-[100px] rounded-xl" />
        <Skeleton className="h-9 w-[100px] rounded-xl" />
      </div>
      <Skeleton className="flex h-[42px] w-full max-w-md rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[240px] w-full rounded-[14px]" />
        <Skeleton className="h-[240px] w-full rounded-[14px]" />
      </div>
      <Skeleton className="h-[280px] w-full rounded-[14px]" />
    </div>
  );
}
