import { Skeleton } from "@/components/ui/Skeleton";

export function HomeCareerSectionSkeleton() {
  return (
    <div className="px-3 pb-4">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-3 w-32 rounded-[12px]" />
        <div className="h-px flex-1 bg-[rgba(45,32,32,0.08)]" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-[16px]" />
        <Skeleton className="h-16 w-full rounded-[16px]" />
      </div>
    </div>
  );
}
