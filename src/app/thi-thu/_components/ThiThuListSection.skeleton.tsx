import { Skeleton } from "@/components/ui/Skeleton";

function ThiThuListCardSkeleton() {
  return (
    <div
      className="tti-ttc overflow-hidden rounded-[14px] border border-[rgba(45,32,32,0.18)] bg-white shadow-[0_4px_24px_rgba(45,32,32,0.09)]"
      aria-hidden
    >
      <Skeleton className="aspect-video w-full rounded-none rounded-t-[14px]" />
      <div className="space-y-2 px-4 py-3.5">
        <Skeleton className="h-5 w-20 rounded-[999px]" />
        <Skeleton className="h-4 w-[72%] rounded-[12px]" />
        <Skeleton className="h-3 w-[48%] rounded-[12px]" />
        <Skeleton className="h-3 w-[56%] rounded-[12px]" />
        <Skeleton className="mt-3 h-10 w-full rounded-[999px]" />
      </div>
    </div>
  );
}

/** Khớp `.tti-grid3` + `.tti-ttc` — tránh layout shift khi list load. */
export function ThiThuListSectionSkeleton() {
  return (
    <div className="tti-list">
      <div className="tti-grid3">
        <ThiThuListCardSkeleton />
        <ThiThuListCardSkeleton />
        <ThiThuListCardSkeleton />
      </div>
    </div>
  );
}
