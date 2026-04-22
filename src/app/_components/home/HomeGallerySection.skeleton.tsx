import { Skeleton } from "@/components/ui/Skeleton";

export function HomeGallerySectionSkeleton() {
  return (
    <div className="px-3">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-3 w-28 rounded-[12px]" />
        <div className="h-px flex-1 bg-[rgba(45,32,32,0.08)]" />
      </div>
      <div className="mb-3 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-16 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-[16px]" />
        ))}
      </div>
    </div>
  );
}
