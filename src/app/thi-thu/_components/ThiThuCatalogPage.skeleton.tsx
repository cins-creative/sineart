import { Skeleton } from "@/components/ui/Skeleton";

import ThiThuFooter from "../ThiThuFooter";
import { ThiThuStyles } from "../ThiThuStyles";
import { ThiThuNavBarSectionSkeleton } from "./ThiThuNavBarSection.skeleton";
import { ThiThuListSectionSkeleton } from "./ThiThuListSection.skeleton";

/** Skeleton segment `/thi-thu`: nav + hero + grid — shimmer qua `.skeleton-base`. */
export function ThiThuCatalogPageSkeleton() {
  return (
    <div className="sa-root sa-thi-thu">
      <ThiThuStyles />
      <ThiThuNavBarSectionSkeleton />

      <section className="tti-hero">
        <div className="tti-hero-orb tti-hero-orb-1" aria-hidden />
        <div className="tti-hero-orb tti-hero-orb-2" aria-hidden />
        <div className="tti-hero-orb tti-hero-orb-3" aria-hidden />
        <div className="tti-hero-tag mx-auto mb-4 w-fit max-w-full justify-center">
          <div className="tti-hero-tag-dot" aria-hidden />
          <Skeleton className="h-3.5 w-36 rounded-[8px]" />
        </div>
        <Skeleton className="mx-auto mb-3 h-11 w-[min(92%,380px)] rounded-[16px]" />
        <Skeleton className="mx-auto mb-2 h-4 w-[min(88%,520px)] rounded-[12px]" />
        <Skeleton className="mx-auto h-4 w-[min(72%,400px)] rounded-[12px]" />
      </section>

      <ThiThuListSectionSkeleton />

      <ThiThuFooter />
    </div>
  );
}
