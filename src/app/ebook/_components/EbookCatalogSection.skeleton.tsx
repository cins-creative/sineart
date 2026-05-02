import { Skeleton } from "@/components/ui/Skeleton";

/** Hero + toolbar + grid — khớp `.sa-ebook` listing (padding / grid). */
export function EbookCatalogSectionSkeleton() {
  return (
    <>
      <section className="page-hero" aria-hidden>
        <div className="page-hero-bg" />
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
        <div className="page-hero-inner">
          <div>
            <Skeleton style={{ width: 220, height: 36, borderRadius: 999, marginBottom: 20 }} />
            <Skeleton style={{ width: "92%", maxWidth: 520, height: 52, borderRadius: 16, marginBottom: 14 }} />
            <Skeleton style={{ width: "88%", maxWidth: 480, height: 52, borderRadius: 16, marginBottom: 18 }} />
            <Skeleton style={{ width: "100%", maxWidth: 480, height: 14, borderRadius: 8, marginBottom: 8 }} />
            <Skeleton style={{ width: "90%", maxWidth: 440, height: 14, borderRadius: 8, marginBottom: 8 }} />
            <Skeleton style={{ width: "70%", maxWidth: 360, height: 14, borderRadius: 8 }} />
          </div>
          <div className="ph-side">
            {[0, 1, 2].map((k) => (
              <div key={k} className="ph-stat">
                <div className="n">
                  <Skeleton style={{ width: 56, height: 34, borderRadius: 12 }} />
                </div>
                <div className="l" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton style={{ width: "88%", height: 12, borderRadius: 8 }} />
                  <Skeleton style={{ width: "62%", height: 10, borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="eb-body" aria-hidden>
        <div className="eb-toolbar">
          <Skeleton style={{ flex: 1, height: 46, borderRadius: 14, minWidth: 260, maxWidth: 520 }} />
          <Skeleton style={{ width: 220, height: 46, borderRadius: 14 }} />
        </div>
        <div className="eb-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="eb-card" style={{ cursor: "default", pointerEvents: "none" }}>
              <Skeleton className="eb-card-thumb" style={{ width: "100%", aspectRatio: "3/4", borderRadius: 14 }} />
              <div className="eb-card-body">
                <Skeleton style={{ width: "95%", height: 18, borderRadius: 8 }} />
                <Skeleton style={{ width: "60%", height: 12, borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
