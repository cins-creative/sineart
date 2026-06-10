import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export function OverviewHvTrackingPanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 pb-2", className)} aria-busy="true" aria-label="Đang tải theo dõi học viên">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-[72px] w-full rounded-2xl" />
      <Skeleton className="h-[72px] w-full rounded-2xl" />
      <div className="flex flex-wrap gap-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] min-w-[120px] flex-1 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[280px] w-full rounded-2xl" />
      <Skeleton className="h-[200px] w-full rounded-2xl" />
    </div>
  );
}
