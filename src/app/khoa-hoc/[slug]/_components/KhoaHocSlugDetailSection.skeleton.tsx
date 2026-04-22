import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Mirror layout `KhoaHocDetailView`: breadcrumb + title row + 2 cột (main + sidebar).
 * Dùng CSS thật từ `khoa-hoc-detail.css` để không bị layout shift khi data về.
 */
export function KhoaHocSlugDetailSectionSkeleton() {
  return (
    <div
      className="sa-root khoa-hoc-page"
      style={{ height: "fit-content" }}
      aria-busy="true"
      aria-label="Đang tải khóa học"
    >
      <div className="kd-page">
        <nav className="kd-bc" aria-hidden>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-3 w-14 rounded-[12px]" />
            <span className="kd-bc-sep">›</span>
            <Skeleton className="h-3 w-20 rounded-[12px]" />
            <span className="kd-bc-sep">›</span>
            <Skeleton className="h-3 w-28 rounded-[12px]" />
            <span className="kd-bc-sep">›</span>
            <Skeleton className="h-3 w-40 rounded-[12px]" />
          </div>
        </nav>

        <div className="kd-page-grid">
          <header className="kd-page-title-row">
            <div className="flex items-center gap-2">
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-3 w-36 rounded-[12px]" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-9 w-[min(100%,28rem)] rounded-[16px]" />
              <Skeleton className="h-9 w-[min(100%,22rem)] rounded-[16px]" />
            </div>
            <div className="kd-page-title-rule" aria-hidden />
          </header>

          <div className="kd-page-main space-y-10">
            <section className="kd-block">
              <Skeleton className="mb-2 h-3 w-40 rounded-[12px]" />
              <Skeleton className="h-7 w-[min(100%,32rem)] rounded-[16px]" />
              <Skeleton className="mt-3 h-4 w-[min(100%,28rem)] rounded-[12px]" />

              <div className="mt-6 overflow-hidden rounded-[20px] border border-[rgba(45,32,32,0.08)]">
                <Skeleton className="aspect-[16/10] max-h-[420px] w-full rounded-none" />
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="size-14 shrink-0 rounded-[12px]" />
                ))}
              </div>
            </section>

            <section className="kd-block">
              <Skeleton className="mb-2 h-3 w-24 rounded-[12px]" />
              <Skeleton className="h-7 w-[min(100%,26rem)] rounded-[16px]" />
              <div className="mt-5 grid gap-4 md:grid-cols-[2fr_1fr]">
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton
                      key={i}
                      className={`h-3 ${i === 3 ? "w-[60%]" : "w-full"} rounded-[12px]`}
                    />
                  ))}
                </div>
                <aside className="rounded-[16px] border border-[rgba(45,32,32,0.08)] bg-[rgba(45,32,32,0.03)] p-4 shadow-[0_8px_24px_rgba(45,32,32,0.06)]">
                  <Skeleton className="mb-3 h-4 w-[60%] rounded-[12px]" />
                  <div className="space-y-2">
                    {Array.from({ length: 4 }, (_, i) => (
                      <Skeleton key={i} className="h-3 w-full rounded-[12px]" />
                    ))}
                  </div>
                </aside>
              </div>
            </section>

            <section className="kd-block">
              <Skeleton className="mb-2 h-3 w-28 rounded-[12px]" />
              <Skeleton className="h-7 w-[min(100%,24rem)] rounded-[16px]" />
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-[16px] border border-[rgba(45,32,32,0.08)] bg-[rgba(45,32,32,0.03)] p-4"
                  >
                    <Skeleton className="mb-2 h-5 w-10 rounded-[12px]" />
                    <Skeleton className="h-4 w-[80%] rounded-[12px]" />
                    <Skeleton className="mt-2 h-3 w-[60%] rounded-[12px]" />
                  </div>
                ))}
              </div>
            </section>

            <section className="kd-block">
              <Skeleton className="mb-2 h-3 w-32 rounded-[12px]" />
              <Skeleton className="h-7 w-[min(100%,28rem)] rounded-[16px]" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-[16px] border border-[rgba(45,32,32,0.08)] bg-[rgba(45,32,32,0.03)] p-4"
                  >
                    <Skeleton className="mb-3 h-4 w-20 rounded-[12px]" />
                    <Skeleton className="mb-2 h-3 w-28 rounded-[12px]" />
                    <Skeleton className="mb-3 h-3 w-[70%] rounded-[12px]" />
                    <Skeleton className="mb-3 h-2 w-full rounded-full" />
                    <Skeleton className="h-10 w-full rounded-[12px]" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="kd-sidebar" aria-hidden>
            <div className="rounded-[20px] border border-[rgba(45,32,32,0.08)] bg-[rgba(45,32,32,0.03)] p-5 shadow-[0_12px_32px_rgba(45,32,32,0.08)]">
              <Skeleton className="mb-3 h-4 w-28 rounded-[12px]" />
              <Skeleton className="mb-4 h-10 w-32 rounded-[16px]" />
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-[12px]" />
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-[16px] border border-[rgba(45,32,32,0.08)] bg-[rgba(45,32,32,0.03)] p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 border-b border-[rgba(45,32,32,0.06)] py-3 last:border-0"
                >
                  <Skeleton className="h-3 w-24 rounded-[12px]" />
                  <Skeleton className="h-3 w-16 rounded-[12px]" />
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-11 w-full rounded-[16px]" />
              <Skeleton className="h-11 w-full rounded-[16px]" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
