import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder cho NavBar trong lúc fetch `courses`. Giữ đúng chiều cao
 * (~72px desktop, 56px mobile) để tránh layout shift khi data về. Palette
 * dùng ink 6% + shimmer peach như design-system (qua `.skeleton-base`).
 */
export function NavBarBoundarySkeleton() {
  return (
    <div
      aria-hidden
      className="ktn-lib-navbar-skel"
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
      <Skeleton style={{ width: 120, height: 44, borderRadius: 12 }} />
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 14,
          justifyContent: "center",
          maxWidth: 520,
        }}
      >
        <Skeleton style={{ width: 72, height: 16, borderRadius: 8 }} />
        <Skeleton style={{ width: 84, height: 16, borderRadius: 8 }} />
        <Skeleton style={{ width: 64, height: 16, borderRadius: 8 }} />
        <Skeleton style={{ width: 90, height: 16, borderRadius: 8 }} />
        <Skeleton style={{ width: 70, height: 16, borderRadius: 8 }} />
      </div>
      <Skeleton style={{ width: 140, height: 40, borderRadius: 999 }} />
    </div>
  );
}
