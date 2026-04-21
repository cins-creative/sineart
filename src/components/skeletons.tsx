import { cn } from "@/lib/utils";

/** Skeleton khu vực bảng / danh sách admin — Suspense + loading.tsx trong từng route admin */
export function AdminDashboardTableSkeleton({
  rows = 8,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm", className)}
      aria-busy="true"
      aria-label="Đang tải dữ liệu"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="h-10 max-w-md flex-1 animate-pulse rounded-lg bg-zinc-200/80" />
        <div className="flex gap-2">
          <div className="h-9 w-16 animate-pulse rounded-lg bg-zinc-200/70" />
          <div className="h-9 w-16 animate-pulse rounded-lg bg-zinc-200/70" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-zinc-100" />
        ))}
      </div>
    </div>
  );
}

/** Skeleton trang /khoa-hoc — dùng cho Suspense + `loading.tsx` */
export function KhoaHocPageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("min-h-[55vh]", className)}
      aria-busy="true"
      aria-label="Đang tải nội dung khóa học"
    >
      <div className="flex h-14 items-center border-b border-black/5 px-5">
        <div className="h-8 w-28 animate-pulse rounded-lg bg-zinc-200/80" />
        <div className="ml-auto flex gap-2">
          <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200/80" />
        </div>
      </div>

      <header className="kh-head">
        <div className="w-full max-w-md">
          <div className="h-8 w-40 animate-pulse rounded-md bg-zinc-200/80" />
          <div className="mt-3 h-4 max-w-full w-64 animate-pulse rounded bg-zinc-200/70" />
        </div>
      </header>

      <div className="kh-filters flex flex-wrap gap-2" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-9 w-[4.5rem] animate-pulse rounded-full bg-zinc-200/80"
          />
        ))}
      </div>

      <div className="kh-wrap kh-wrap--editorial">
        <div className="mb-6 flex items-center gap-2 pl-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-300" />
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-200/80" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-black/[0.08] bg-zinc-50"
            >
              <div className="aspect-[4/3] animate-pulse bg-zinc-200/70" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-200/80" />
                <div className="h-4 w-full animate-pulse rounded bg-zinc-200/70" />
                <div className="h-3 w-11/12 max-w-[90%] animate-pulse rounded bg-zinc-200/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/** Skeleton trang chủ (`/`) — Suspense + `app/loading.tsx` */
export function HomePageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("pb-6", className)}
      aria-busy="true"
      aria-label="Đang tải trang chủ"
    >
      <div className="flex h-14 items-center border-b border-black/[0.06] px-3 sm:px-4">
        <div className="h-8 w-28 animate-pulse rounded-lg bg-zinc-200/80" />
        <div className="ml-auto flex gap-2">
          <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200/80" />
        </div>
      </div>

      <section className="hero relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[#1a1414]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(20,10,10,0.92)] from-[38%] to-transparent to-100%"
          aria-hidden
        />
        <div className="hero-body">
          <div className="mb-2.5 h-3 w-40 max-w-[85%] animate-pulse rounded bg-white/30" />
          <div className="mb-3.5 h-10 w-full max-w-[min(100%,22rem)] animate-pulse rounded-lg bg-white/20" />
          <div className="mb-2 h-3.5 w-full max-w-[34ch] animate-pulse rounded bg-white/22" />
          <div className="mb-2 h-3.5 w-full max-w-[32ch] animate-pulse rounded bg-white/18" />
          <div className="mt-5 flex gap-2">
            <div className="h-11 flex-1 max-w-[200px] animate-pulse rounded-full bg-white/25" />
            <div className="h-11 w-[8.5rem] animate-pulse rounded-full bg-white/15" />
          </div>
        </div>
      </section>

      <div className="stat-strip">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="stat-card bg-zinc-50">
            <div className="h-8 w-14 animate-pulse rounded-md bg-zinc-200/90" />
            <div className="stat-l mt-2 space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-zinc-200/70" />
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-200/50" />
            </div>
          </div>
        ))}
      </div>

      <div className="page-inner">
        <div className="px-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-200/80" />
            <div className="h-px flex-1 bg-black/10" />
          </div>
          <div className="h-48 w-full animate-pulse rounded-2xl bg-zinc-100" />
        </div>

        <div className="px-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-200/80" />
            <div className="h-px flex-1 bg-black/10" />
          </div>
          <div className="flex gap-3 overflow-hidden pb-1">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="min-w-[min(100%,280px)] flex-1 shrink-0 rounded-2xl border border-black/[0.06] bg-zinc-50 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-200/80" />
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-200/70" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-zinc-200/60" />
                  <div className="h-3 w-[90%] animate-pulse rounded bg-zinc-200/50" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-3 w-28 animate-pulse rounded bg-zinc-200/80" />
            <div className="h-px flex-1 bg-black/10" />
          </div>
          <div className="mb-3 flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="h-8 w-16 shrink-0 animate-pulse rounded-full bg-zinc-200/70"
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-xl bg-zinc-200/50"
              />
            ))}
          </div>
        </div>

        <div className="px-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-200/80" />
            <div className="h-px flex-1 bg-black/10" />
          </div>
          <div className="space-y-3">
            <div className="h-16 w-full animate-pulse rounded-xl bg-zinc-100" />
            <div className="h-16 w-full animate-pulse rounded-xl bg-zinc-100" />
          </div>
        </div>

        <div className="px-3 pb-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-3 w-36 animate-pulse rounded bg-zinc-200/80" />
            <div className="h-px flex-1 bg-black/10" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="h-40 min-w-[140px] flex-1 animate-pulse rounded-xl bg-zinc-200/45"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton trang chi tiết khóa học `/khoa-hoc/[slug]` */
export function KhoaHocDetailPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(className)} aria-busy="true" aria-label="Đang tải khóa học">
      <div className="flex h-14 items-center border-b border-black/5 px-5">
        <div className="h-8 w-28 animate-pulse rounded-lg bg-zinc-200/80" />
        <div className="ml-auto flex gap-2">
          <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200/80" />
        </div>
      </div>

      <div className="sa-root khoa-hoc-page" style={{ height: "fit-content" }}>
        <div className="kd-page">
          <nav className="kd-bc" aria-hidden>
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-3 w-14 animate-pulse rounded bg-zinc-200/70" />
              <span className="kd-bc-sep">›</span>
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-200/70" />
              <span className="kd-bc-sep">›</span>
              <div className="h-3 w-28 animate-pulse rounded bg-zinc-300/80" />
            </div>
          </nav>

          <div className="kd-body">
            <div className="kd-left">
              <div className="kd-eyebrow flex flex-wrap items-center gap-2">
                <div className="h-6 w-[4.5rem] animate-pulse rounded-full bg-zinc-200/90" />
                <div className="h-3 w-32 animate-pulse rounded bg-zinc-200/60" />
              </div>
              <div className="mt-4 h-9 max-w-[min(100%,28rem)] animate-pulse rounded-lg bg-zinc-200/85" />
              <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded bg-zinc-200/65" />
              <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded bg-zinc-200/50" />

              <div className="mt-8 overflow-hidden rounded-2xl border border-black/[0.08] bg-zinc-100/80">
                <div className="aspect-[16/10] max-h-[420px] animate-pulse bg-zinc-200/60" />
              </div>

              <div className="mt-8 flex gap-2 overflow-x-auto pb-1" aria-hidden>
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-zinc-200/55"
                  />
                ))}
              </div>

              <div className="kd-div" aria-hidden />
              <div className="mb-4 h-5 w-48 animate-pulse rounded bg-zinc-200/75" />
              <ul className="kd-learn-grid">
                {Array.from({ length: 4 }, (_, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-xl border border-black/[0.06] bg-zinc-50/90 p-3"
                  >
                    <div className="mt-0.5 h-4 w-4 shrink-0 animate-pulse rounded bg-zinc-300/80" />
                    <div className="h-3.5 flex-1 animate-pulse rounded bg-zinc-200/70" />
                  </li>
                ))}
              </ul>
            </div>

            <aside className="kd-sidebar" aria-hidden>
              <div className="mb-4 h-36 w-full animate-pulse rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200/80" />
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 border-b border-black/[0.06] pb-3 last:border-0 last:pb-0"
                  >
                    <div className="h-3 w-24 animate-pulse rounded bg-zinc-200/70" />
                    <div className="h-3 w-16 animate-pulse rounded bg-zinc-200/50" />
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2">
                <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-200/55" />
                <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-200/45" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
