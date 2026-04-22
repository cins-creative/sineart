import { Skeleton } from "@/components/ui/Skeleton";

export function HomeReviewsSectionSkeleton() {
  return (
    <div className="px-3">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-3 w-24 rounded-[12px]" />
        <div className="h-px flex-1 bg-[rgba(45,32,32,0.08)]" />
      </div>
      <div className="flex gap-3 overflow-hidden pb-1">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="min-w-[min(100%,280px)] flex-1 shrink-0 rounded-[16px] border border-[rgba(45,32,32,0.08)] bg-[rgba(45,32,32,0.03)] p-4 shadow-[0_8px_24px_rgba(45,32,32,0.06)]"
          >
            <div className="mb-3 flex items-center gap-2">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-[12px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded-[12px]" />
              <Skeleton className="h-3 max-w-[90%] rounded-[12px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
