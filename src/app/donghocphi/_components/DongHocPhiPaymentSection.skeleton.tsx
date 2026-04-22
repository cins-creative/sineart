import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Khớp layout của `DongHocPhiClient` ở bước 1: header + step-bar + stepper + card thông tin học viên.
 * Mục tiêu: không có layout shift khi data về — giữ đúng padding `.dhp-page` / `.dhp-wrap`.
 */
export function DongHocPhiPaymentSectionSkeleton() {
  return (
    <main className="dhp-page" aria-busy="true" aria-label="Đang tải trang thanh toán">
      <section className="dhp-wrap">
        <header className="dhp-head">
          <div className="space-y-2">
            <Skeleton className="h-3 w-40 rounded-[12px]" />
            <Skeleton className="h-8 w-60 rounded-[16px]" />
          </div>
        </header>

        <div className="dhp-actions dhp-actions--step-bar">
          <Skeleton className="h-10 w-[220px] rounded-full" />
        </div>

        <div className="dhp-stepper" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-1 items-center gap-2">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-[12px]" />
              {i < 2 ? (
                <div className="ml-2 hidden h-px flex-1 bg-[rgba(45,32,32,0.08)] sm:block" />
              ) : null}
            </div>
          ))}
        </div>

        <div className="dhp-flow">
          <section className="dhp-s1-card">
            <Skeleton className="mb-4 h-3 w-36 rounded-[12px]" />

            <div className="mb-5 flex items-center gap-4">
              <Skeleton className="size-16 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28 rounded-[12px]" />
                <Skeleton className="h-3 w-[80%] rounded-[12px]" />
              </div>
            </div>

            <div className="dhp-field-row">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="dhp-field space-y-2">
                  <Skeleton className="h-3 w-24 rounded-[12px]" />
                  <Skeleton className="h-10 w-full rounded-[12px]" />
                </div>
              ))}
            </div>

            <div className="dhp-field dhp-field--full space-y-2">
              <Skeleton className="h-3 w-16 rounded-[12px]" />
              <Skeleton className="h-10 w-full rounded-[12px]" />
            </div>

            <div className="dhp-field-row">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="dhp-field space-y-2">
                  <Skeleton className="h-3 w-20 rounded-[12px]" />
                  <Skeleton className="h-10 w-full rounded-[12px]" />
                </div>
              ))}
            </div>

            <div className="dhp-field-row">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="dhp-field space-y-2">
                  <Skeleton className="h-3 w-24 rounded-[12px]" />
                  <Skeleton className="h-10 w-full rounded-[12px]" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
