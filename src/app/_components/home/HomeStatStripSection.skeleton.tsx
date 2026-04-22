import { Skeleton } from "@/components/ui/Skeleton";

export function HomeStatStripSectionSkeleton() {
  return (
    <div className="stat-strip">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="stat-card bg-[rgba(45,32,32,0.04)]">
          <Skeleton className="h-8 w-14 rounded-[12px]" />
          <div className="stat-l mt-2 space-y-1.5">
            <Skeleton className="h-3 w-24 rounded-[12px]" />
            <Skeleton className="h-3 w-16 rounded-[12px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
