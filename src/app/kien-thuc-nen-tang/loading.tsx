import { Skeleton } from "@/components/ui/Skeleton";

import { NavBarBoundarySkeleton } from "./_components/NavBarBoundary.skeleton";

import "./kien-thuc-library.css";

/**
 * Skeleton segment `/kien-thuc-nen-tang` — hiện khi điều hướng tới landing (trước khi RSC stream).
 * Layout khớp `KienThucNenTangView`: navbar · lnav · main (hero + catalog + grid) · rnav.
 */
export default function KienThucNenTangLoading() {
  return (
    <div className="sa-root kien-thuc-nen-tang-root" aria-busy="true" aria-label="Đang tải thư viện">
      <NavBarBoundarySkeleton />

      <div className="ktn-lib">
        <div className="page">
          <aside className="lnav" aria-hidden>
            <div className="lnav-search" style={{ marginBottom: 16 }}>
              <Skeleton style={{ width: "100%", height: 36, borderRadius: 10 }} />
            </div>
            {Array.from({ length: 3 }, (_, s) => (
              <div key={s} style={{ marginBottom: 20 }}>
                <Skeleton style={{ width: 120, height: 10, borderRadius: 5, marginBottom: 10 }} />
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton
                    key={i}
                    style={{ width: "100%", height: 14, borderRadius: 6, marginBottom: 8 }}
                  />
                ))}
              </div>
            ))}
          </aside>

          <main>
            <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }} aria-hidden>
              <Skeleton style={{ width: 64, height: 12, borderRadius: 6 }} />
              <span style={{ color: "rgba(45,32,32,0.3)", fontSize: 11 }}>›</span>
              <Skeleton style={{ width: 200, height: 12, borderRadius: 6 }} />
            </div>

            <section
              className="lib-landing-hero"
              style={{ minHeight: 320, position: "relative" }}
              aria-hidden
            >
              <Skeleton style={{ width: 160, height: 10, borderRadius: 5, marginBottom: 16 }} />
              <Skeleton style={{ width: "88%", maxWidth: 520, height: 48, borderRadius: 14, marginBottom: 16 }} />
              <Skeleton style={{ width: "100%", height: 16, borderRadius: 8, marginBottom: 8 }} />
              <Skeleton style={{ width: "92%", height: 16, borderRadius: 8, marginBottom: 8 }} />
              <Skeleton style={{ width: "70%", height: 16, borderRadius: 8, marginBottom: 20 }} />
              <div style={{ display: "flex", gap: 12 }}>
                <Skeleton style={{ width: 88, height: 12, borderRadius: 6 }} />
                <Skeleton style={{ width: 100, height: 12, borderRadius: 6 }} />
                <Skeleton style={{ width: 110, height: 12, borderRadius: 6 }} />
              </div>
            </section>

            <section style={{ marginTop: 36 }} aria-hidden>
              <Skeleton style={{ width: 220, height: 22, borderRadius: 10, marginBottom: 10 }} />
              <Skeleton style={{ width: "64%", height: 14, borderRadius: 7, marginBottom: 24 }} />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton
                    key={i}
                    style={{
                      width: "100%",
                      aspectRatio: "4/3",
                      borderRadius: 16,
                      minHeight: 200,
                    }}
                  />
                ))}
              </div>
            </section>
          </main>

          <aside className="rnav" aria-hidden>
            <Skeleton style={{ width: 140, height: 10, borderRadius: 5, marginBottom: 12 }} />
            <Skeleton style={{ width: "100%", height: 72, borderRadius: 12, marginBottom: 20 }} />
            <Skeleton style={{ width: 100, height: 10, borderRadius: 5, marginBottom: 10 }} />
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} style={{ width: `${80 + (i % 3) * 5}%`, height: 14, borderRadius: 6, marginBottom: 8 }} />
            ))}
            <Skeleton style={{ width: "100%", height: 160, borderRadius: 16, marginTop: 20 }} />
          </aside>
        </div>
      </div>
    </div>
  );
}
