import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Skeleton khớp layout mới:
 * - Header (eyebrow + title + meta chips)
 * - Hero video full-width (ngoài split, lớn nhất)
 * - Split: left (callout "Lý thuyết bắt buộc" + bai list) | right (Hướng dẫn + Lỗi sai details + Gallery)
 * Ink 6% + peach shimmer, không gray, không sharp corners.
 */
export function LessonBodyAsyncSkeleton() {
  return (
    <article className="htbt-shell" aria-busy="true" aria-label="Đang tải bài tập">
      <header className="htbt-header">
        <Skeleton className="mb-3 h-3 w-56 max-w-[80%] rounded-[6px]" />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Skeleton className="h-7 w-[5.5rem] rounded-[8px]" />
          <Skeleton className="h-7 w-[min(100%,22rem)] rounded-[8px]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </header>

      {/* Hero video — full-width, ngoài grid */}
      <section className="htbt-hero-video" aria-hidden>
        <div className="htbt-hero-video-stage">
          <div className="htbt-video-area">
            <Skeleton className="absolute inset-0 rounded-none" />
          </div>
        </div>
      </section>

      <div className="htbt-split">
        <div className="htbt-left-panel">
          {/* Lý thuyết callout — bắt buộc */}
          <section className="htbt-lt-callout" aria-hidden>
            <div className="htbt-lt-callout-head">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="ml-auto h-3 w-14 rounded-[6px]" />
            </div>
            <Skeleton className="mb-2 h-4 w-[80%] rounded-[8px]" />
            <Skeleton className="mb-3 h-3 w-[55%] rounded-[8px]" />
            <ul className="htbt-lt-stack" role="list">
              {[0, 1, 2].map((i) => (
                <li key={i} className="htbt-lt-row">
                  <div className="htbt-lt-row-link" style={{ cursor: "default" }}>
                    <div className="htbt-lt-step">
                      <Skeleton className="mx-auto h-3 w-4 rounded-[4px]" />
                    </div>
                    <Skeleton className="htbt-lt-row-thumb" />
                    <div className="htbt-lt-row-meta">
                      <Skeleton className="h-3.5 w-[85%] rounded-[6px]" />
                      <Skeleton className="mt-1 h-3 w-16 rounded-[6px]" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="htbt-left-bottom">
            <div className="htbt-bai-sticky">
              <details className="htbt-bai-details" aria-hidden>
                <summary
                  className="htbt-bai-summary"
                  style={{ cursor: "default" }}
                >
                  <span className="htbt-sec-label htbt-bai-summary-label">
                    Xem bài tập khác
                  </span>
                  <Skeleton className="ml-auto h-5 w-14 rounded-full" />
                </summary>
                <div className="htbt-sec-label htbt-bai-nav-label">
                  Xem bài tập khác
                </div>
                <nav
                  className="htbt-bai-list"
                  aria-label="Đang tải danh sách bài"
                  aria-hidden
                >
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="htbt-bai-item"
                    style={{ cursor: "default" }}
                  >
                    <Skeleton className="htbt-bai-thumb" />
                    <div className="htbt-bai-meta">
                      <Skeleton className="h-3 w-16 rounded-[6px]" />
                      <Skeleton className="mt-1.5 h-3.5 w-[80%] rounded-[6px]" />
                    </div>
                  </div>
                ))}
                </nav>
              </details>
            </div>
          </div>
        </div>

        <div className="htbt-right-panel">
          <div className="htbt-right-scroll">
            <div className="htbt-r-section">
              <div className="htbt-sec-label">Hướng dẫn bài tập</div>
              <div className="space-y-2.5">
                <Skeleton className="h-3.5 w-full rounded-[8px]" />
                <Skeleton className="h-3.5 w-[92%] rounded-[8px]" />
                <Skeleton className="h-3.5 w-[85%] rounded-[8px]" />
                <Skeleton className="h-3.5 w-[70%] rounded-[8px]" />
                <Skeleton className="mt-3 h-3.5 w-[94%] rounded-[8px]" />
                <Skeleton className="h-3.5 w-[66%] rounded-[8px]" />
              </div>
            </div>

            {/* Lỗi sai — details collapsed */}
            <div className="htbt-r-section">
              <div className="htbt-ls-details" aria-hidden>
                <div
                  className="htbt-ls-summary"
                  style={{ cursor: "default" }}
                >
                  <Skeleton className="h-[34px] w-[34px] rounded-full" />
                  <div className="htbt-ls-summary-body">
                    <Skeleton className="h-3.5 w-40 rounded-[6px]" />
                    <Skeleton className="mt-1 h-3 w-28 rounded-[6px]" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded-[4px]" />
                </div>
              </div>
            </div>

            <div className="htbt-r-section">
              <div className="htbt-r-sec-head">
                <div className="htbt-sec-label">Tranh tham khảo</div>
                <Skeleton className="h-3 w-28 rounded-[6px]" />
              </div>
              <div style={{ columns: 3, columnGap: 7 }}>
                {[160, 200, 140, 180, 220, 130, 170, 150, 190].map((h, i) => (
                  <Skeleton
                    key={i}
                    className="mb-2 w-full rounded-[16px]"
                    style={{
                      height: h,
                      breakInside: "avoid",
                      display: "inline-block",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
