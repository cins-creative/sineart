import { Skeleton } from "@/components/ui/Skeleton";

/** Khớp `.ebd-shell` / grid main + sidebar 300px — shimmer peach qua `.skeleton-base`. */
export function EbookDetailMainSkeleton() {
  return (
    <div className="ebd-shell" aria-hidden>
      <div className="ebd-body">
        <main className="ebd-main">
          <div className="ebd-crumb" style={{ marginBottom: 18 }}>
            <Skeleton style={{ width: 160, height: 28, borderRadius: 10 }} />
          </div>

          <header className="ebd-header">
            <Skeleton className="ebd-h-thumb" style={{ width: 140, aspectRatio: "3/4", borderRadius: 12 }} />
            <div className="ebd-h-info" style={{ gap: 12 }}>
              <Skeleton style={{ width: 140, height: 14, borderRadius: 8 }} />
              <Skeleton style={{ width: "100%", maxWidth: 420, height: 36, borderRadius: 12 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Skeleton style={{ width: 72, height: 22, borderRadius: 999 }} />
                <Skeleton style={{ width: 88, height: 22, borderRadius: 999 }} />
              </div>
              <Skeleton style={{ width: 240, height: 14, borderRadius: 8 }} />
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <Skeleton style={{ width: 120, height: 40, borderRadius: 12 }} />
                <Skeleton style={{ width: 120, height: 40, borderRadius: 12 }} />
              </div>
            </div>
          </header>

          <Skeleton style={{ width: "100%", height: 320, borderRadius: 16, marginTop: 24 }} />

          <div style={{ marginTop: 28 }}>
            <Skeleton style={{ width: 200, height: 22, borderRadius: 10, marginBottom: 14 }} />
            <Skeleton style={{ width: "100%", height: 12, borderRadius: 8, marginBottom: 8 }} />
            <Skeleton style={{ width: "96%", height: 12, borderRadius: 8, marginBottom: 8 }} />
            <Skeleton style={{ width: "88%", height: 12, borderRadius: 8 }} />
          </div>
        </main>

        <aside className="ebd-sidebar">
          <div className="ebd-sb-stats">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="ebd-sb-stat">
                <Skeleton style={{ width: "60%", height: 11, borderRadius: 6 }} />
                <Skeleton style={{ width: "40%", height: 18, borderRadius: 8, marginTop: 6 }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <Skeleton style={{ width: 120, height: 12, borderRadius: 6, marginBottom: 12 }} />
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <Skeleton style={{ width: 48, height: 64, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Skeleton style={{ width: "95%", height: 14, borderRadius: 8, marginBottom: 6 }} />
                  <Skeleton style={{ width: "55%", height: 11, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
