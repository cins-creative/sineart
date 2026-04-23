import { Skeleton } from "@/components/ui/Skeleton";

import { LibSidebarNavSkeleton } from "../_components/LibSidebarNav.skeleton";
import { NavBarBoundarySkeleton } from "../_components/NavBarBoundary.skeleton";

import "../kien-thuc-library.css";

/**
 * Segment-level loading UI cho `/kien-thuc-nen-tang/[slug]`. Hiện ngay khi
 * user click `<Link>` chuyển trang — trước cả khi server bắt đầu render.
 *
 * Skeleton này match layout của page thật:
 * - Navbar placeholder 72px
 * - 3-column grid: left sidebar · main (hero + body) · right sidebar (toc + cta)
 *
 * Tuân thủ design system Sine Art: ink 6% background, shimmer peach 15%,
 * radius 12/16/20, không dùng gray neutral.
 */
export default function Loading() {
  return (
    <div className="sa-root kien-thuc-nen-tang-root" aria-busy="true" aria-label="Đang tải bài lý thuyết">
      <NavBarBoundarySkeleton />

      <div className="ktn-lib">
        <div className="page">
          {/* LEFT NAV */}
          <aside className="lnav" aria-label="Danh mục thư viện" aria-hidden>
            <div className="lnav-search" style={{ marginBottom: 16 }}>
              <Skeleton style={{ width: "100%", height: 36, borderRadius: 10 }} />
            </div>
            <LibSidebarNavSkeleton />
          </aside>

          {/* MAIN */}
          <main>
            {/* breadcrumb */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 18,
                alignItems: "center",
              }}
              aria-hidden
            >
              <Skeleton style={{ width: 60, height: 12, borderRadius: 6 }} />
              <span style={{ color: "rgba(45,32,32,0.3)", fontSize: 11 }}>›</span>
              <Skeleton style={{ width: 90, height: 12, borderRadius: 6 }} />
              <span style={{ color: "rgba(45,32,32,0.3)", fontSize: 11 }}>›</span>
              <Skeleton style={{ width: 140, height: 12, borderRadius: 6 }} />
            </div>

            {/* HERO */}
            <div
              aria-hidden
              style={{
                position: "relative",
                borderRadius: 20,
                padding: "44px 36px",
                background:
                  "linear-gradient(135deg, rgba(45,32,32,0.94) 0%, rgba(60,40,40,0.92) 100%)",
                overflow: "hidden",
                minHeight: 440,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: 14,
              }}
            >
              <Skeleton
                style={{
                  width: 220,
                  height: 10,
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <Skeleton
                style={{
                  width: "70%",
                  height: 52,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.12)",
                }}
              />
              <Skeleton
                style={{
                  width: "92%",
                  height: 14,
                  borderRadius: 7,
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <Skeleton
                style={{
                  width: "78%",
                  height: 14,
                  borderRadius: 7,
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
                <Skeleton
                  style={{
                    width: 80,
                    height: 12,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.08)",
                  }}
                />
                <Skeleton
                  style={{
                    width: 70,
                    height: 12,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.08)",
                  }}
                />
                <Skeleton
                  style={{
                    width: 90,
                    height: 12,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.08)",
                  }}
                />
              </div>
            </div>

            {/* BODY — paragraph skeleton */}
            <div
              aria-hidden
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                marginTop: 28,
              }}
            >
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton
                  key={i}
                  style={{
                    width: `${80 + ((i * 13) % 18)}%`,
                    height: 16,
                    borderRadius: 6,
                  }}
                />
              ))}
              <Skeleton
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: 16,
                  marginTop: 12,
                }}
              />
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton
                  key={`p2-${i}`}
                  style={{
                    width: `${74 + ((i * 11) % 24)}%`,
                    height: 16,
                    borderRadius: 6,
                  }}
                />
              ))}
            </div>
          </main>

          {/* RIGHT NAV */}
          <aside className="rnav" aria-label="Mục lục" aria-hidden>
            <Skeleton
              style={{ width: 110, height: 10, borderRadius: 5, marginBottom: 10 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton
                  key={i}
                  style={{
                    width: `${72 + ((i * 9) % 20)}%`,
                    height: 14,
                    borderRadius: 6,
                  }}
                />
              ))}
            </div>
            <Skeleton
              style={{
                width: 60,
                height: 10,
                borderRadius: 5,
                marginTop: 24,
                marginBottom: 10,
              }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton
                  key={i}
                  style={{
                    width: 56 + ((i * 13) % 24),
                    height: 22,
                    borderRadius: 999,
                  }}
                />
              ))}
            </div>
            <div style={{ marginTop: 28 }}>
              <Skeleton
                style={{
                  width: "100%",
                  height: 180,
                  borderRadius: 16,
                }}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
