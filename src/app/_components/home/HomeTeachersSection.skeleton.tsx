import { Skeleton } from "@/components/ui/Skeleton";

export function HomeTeachersSectionSkeleton() {
  return (
    <div className="px-3 pb-4">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-3 w-36 rounded-[12px]" />
        <div className="h-px flex-1 bg-[rgba(45,32,32,0.08)]" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 min-w-[140px] flex-1 rounded-[16px]" />
        ))}
      </div>
    </div>
  );
}
