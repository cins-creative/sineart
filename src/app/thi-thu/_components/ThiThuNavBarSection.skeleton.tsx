import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder NavBar khi fetch `getKhoaHocPageData` — ~72px, ink 6% + shimmer peach.
 */
export function ThiThuNavBarSectionSkeleton() {
  return (
    <div
      aria-hidden
      className="tti-nav-skel"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        width: "100%",
        padding: "12px 24px",
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(45,32,32,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 18,
        minHeight: 72,
      }}
    >
      <Skeleton className="h-11 w-[120px] rounded-[12px]" />
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 14,
          justifyContent: "center",
          maxWidth: 520,
        }}
      >
        <Skeleton className="h-4 w-[72px] rounded-[8px]" />
        <Skeleton className="h-4 w-[84px] rounded-[8px]" />
        <Skeleton className="h-4 w-16 rounded-[8px]" />
        <Skeleton className="h-4 w-[90px] rounded-[8px]" />
        <Skeleton className="h-4 w-[70px] rounded-[8px]" />
      </div>
      <Skeleton className="h-10 w-[140px] rounded-[999px]" />
    </div>
  );
}
