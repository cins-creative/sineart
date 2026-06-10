import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export function OverviewMetaInsightsPanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 pb-2", className)} aria-busy="true" aria-label="Đang tải Meta insights">
      <Skeleton className="h-8 w-56 rounded-lg" />
      <Skeleton className="h-[72px] w-full rounded-2xl" />
      <div className="flex flex-wrap gap-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] min-w-[130px] flex-1 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[240px] w-full rounded-2xl" />
      <Skeleton className="h-[280px] w-full rounded-2xl" />
    </div>
  );
}
