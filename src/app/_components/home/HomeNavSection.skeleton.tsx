import { Skeleton } from "@/components/ui/Skeleton";

/** Khớp chiều cao NavBar cố định — không chặn hero. */
export function HomeNavSectionSkeleton() {
  return (
    <div className="flex h-14 items-center border-b border-black/[0.06] px-3 sm:px-4">
      <Skeleton className="h-8 w-28 rounded-xl" />
      <div className="ml-auto flex gap-2">
        <Skeleton className="size-9 rounded-full" />
      </div>
    </div>
  );
}
