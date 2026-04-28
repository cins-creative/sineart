import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/** Khớp BCTC tổng quan: khối tóm tắt + biểu đồ đường — shimmer peach via `.skeleton-base`. */
export function OverviewBctcPanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} aria-busy="true" aria-label="Đang tải BCTC tổng quan">
      <div className="overflow-hidden rounded-[14px] border border-[#EDE8E9] bg-white shadow-[0_1px_8px_rgba(45,32,32,0.06)]">
        <div className="border-b border-[#EDE8E9] bg-[#fafafa] px-4 py-2.5">
          <Skeleton className="h-4 w-48 rounded-lg" />
          <Skeleton className="mt-2 h-3 w-full max-w-md rounded-lg" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="rounded-[14px] border border-[#EDE8E9] bg-white p-4 shadow-[0_1px_8px_rgba(45,32,32,0.06)]">
        <Skeleton className="mb-3 h-3 w-40 rounded-lg" />
        <Skeleton className="h-[180px] w-full rounded-xl" />
      </div>
    </div>
  );
}
