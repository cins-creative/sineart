import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Match layout của `RelatedNav`:
 *   .related-section
 *     .sec-lbl                             ← eyebrow
 *     .rel-grid (2 cols responsive)
 *       .rel-card × 4                       ← thumbnail 80px + title + meta
 *     .pn (2 cols prev + next)
 *       .pn-a × 2                           ← block dark với label + title
 */
export function RelatedNavSkeleton() {
  return (
    <div className="related-section" aria-hidden aria-busy="true">
      <Skeleton
        style={{
          width: 140,
          height: 11,
          borderRadius: 6,
          marginBottom: 14,
        }}
      />
      <div className="rel-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rel-card"
            style={{
              display: "flex",
              gap: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(45,32,32,0.06)",
              background: "rgba(45,32,32,0.02)",
            }}
          >
            <Skeleton
              style={{
                width: 80,
                height: 80,
                borderRadius: 10,
                flex: "0 0 auto",
              }}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 6 }}>
              <Skeleton style={{ width: "92%", height: 14, borderRadius: 6 }} />
              <Skeleton style={{ width: "70%", height: 14, borderRadius: 6 }} />
              <Skeleton style={{ width: "46%", height: 10, borderRadius: 5, marginTop: 4 }} />
            </div>
          </div>
        ))}
      </div>

      <div
        className="pn"
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(45,32,32,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 80,
            }}
          >
            <Skeleton style={{ width: 90, height: 10, borderRadius: 5 }} />
            <Skeleton style={{ width: "80%", height: 16, borderRadius: 7 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
