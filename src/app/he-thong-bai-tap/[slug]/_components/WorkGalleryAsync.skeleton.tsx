import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Skeleton masonry 3 cột khớp `.htbt-work-gallery .masonry` (fallback 2 cột ≤640px).
 * Ink 6% + peach shimmer, radius 16 cho card — không gray, không sharp corners.
 */
export function WorkGalleryAsyncSkeleton() {
  const heights = [160, 200, 140, 180, 220, 130, 170, 150, 190];
  return (
    <div
      className="htbt-work-gallery"
      aria-busy="true"
      aria-label="Đang tải tranh tham khảo"
    >
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="htbt-work-gallery-skel">
        {heights.map((h, i) => (
          <Skeleton
            key={i}
            className="mb-[7px] w-full rounded-[16px]"
            style={{
              height: h,
              breakInside: "avoid",
              display: "inline-block",
            }}
          />
        ))}
      </div>
      <style>{`
        .htbt-work-gallery-skel { columns: 3; column-gap: 7px; }
        @media (max-width: 640px) {
          .htbt-work-gallery-skel { columns: 2; }
        }
      `}</style>
    </div>
  );
}
