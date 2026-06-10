import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export function OverviewSearchConsolePanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 pb-2", className)} aria-busy="true" aria-label="Đang tải Google Search">
      <Skeleton className="h-8 w-56 rounded-lg" />
      <Skeleton className="h-[72px] w-full rounded-2xl" />
      <div className="flex flex-wrap gap-2.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] min-w-[120px] flex-1 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[240px] w-full rounded-2xl" />
      <Skeleton className="h-[340px] w-full rounded-2xl" />
    </div>
  );
}
