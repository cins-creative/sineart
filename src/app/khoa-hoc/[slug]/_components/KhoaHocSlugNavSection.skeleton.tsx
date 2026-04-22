import { Skeleton } from "@/components/ui/Skeleton";

/** Khớp chiều cao NavBar — không chặn detail khi nav fetch courses. */
export function KhoaHocSlugNavSectionSkeleton() {
  return (
    <div className="flex h-14 items-center border-b border-[rgba(45,32,32,0.08)] px-3 sm:px-4">
      <Skeleton className="h-8 w-28 rounded-xl" />
      <div className="ml-auto flex gap-2">
        <Skeleton className="size-9 rounded-full" />
      </div>
    </div>
  );
}
