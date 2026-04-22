import { Skeleton } from "@/components/ui/Skeleton";

/** Khớp chiều cao NavBar — ink 6% + peach shimmer, không block shell chi tiết bài. */
export function NavBarAsyncSkeleton() {
  return (
    <div
      className="flex h-14 items-center border-b border-[rgba(45,32,32,0.06)] px-3 sm:px-4"
      aria-hidden
    >
      <Skeleton className="h-8 w-28 rounded-xl" />
      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="hidden h-6 w-16 rounded-full md:block" />
        <Skeleton className="hidden h-6 w-16 rounded-full md:block" />
        <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
        <Skeleton className="size-9 rounded-full" />
      </div>
    </div>
  );
}
