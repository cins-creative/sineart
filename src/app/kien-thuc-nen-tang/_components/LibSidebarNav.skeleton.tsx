import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Match structure của `<LibSidebarNav />` rendered:
 *   .lnav-section
 *     .lnav-cat  ← tiêu đề nhóm (width ~60%)
 *     .lnav-item × N  ← link bài (width ~85% lần 1, random-ish)
 *
 * Render 4 group × 3-4 items để gần giống layout thật → giảm CLS.
 */
const GROUP_ITEM_COUNTS = [4, 3, 4, 3];

export function LibSidebarNavSkeleton() {
  return (
    <div aria-hidden style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {GROUP_ITEM_COUNTS.map((count, gi) => (
        <div
          key={gi}
          className="lnav-section"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <Skeleton
            style={{
              width: `${45 + ((gi * 7) % 25)}%`,
              height: 12,
              borderRadius: 6,
              marginBottom: 6,
            }}
          />
          {Array.from({ length: count }, (_, i) => (
            <Skeleton
              key={i}
              style={{
                width: `${72 + ((i * 11) % 22)}%`,
                height: 16,
                borderRadius: 8,
                marginLeft: 14,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
