import { Skeleton } from "@/components/ui/Skeleton";

/** Giữ chiều cao nav cố định — không chặn phần thân payment khi nav đang tải. */
export function DongHocPhiNavSectionSkeleton() {
  return (
    <div className="flex h-14 items-center border-b border-[rgba(45,32,32,0.08)] px-3 sm:px-4">
      <Skeleton className="h-8 w-28 rounded-xl" />
      <div className="ml-auto flex gap-2">
        <Skeleton className="size-9 rounded-full" />
      </div>
    </div>
  );
}
