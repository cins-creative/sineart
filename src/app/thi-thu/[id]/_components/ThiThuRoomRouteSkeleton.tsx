import { Skeleton } from "@/components/ui/Skeleton";

/** Khớp `tti-ex-wrap` / `tti-ex-body` — nền gradient giống phòng thi đang làm bài. */
export function ThiThuRoomRouteSkeleton() {
  return (
    <div className="min-h-[100dvh] min-[900px]:min-h-[calc(100dvh-76px)] bg-[#fdf7f3] font-[family-name:var(--font-quicksand)] text-[#2d2020]">
      <div className="tti-ex-wrap">
        <div className="tti-ex-body">
          <div className="mb-5 flex flex-col items-center text-center">
            <Skeleton className="mb-2 h-9 w-[min(92%,280px)] max-w-[320px] rounded-[999px]" />
            <Skeleton className="mb-1 h-6 w-[min(80%,200px)] rounded-[12px]" />
            <Skeleton className="mb-2 h-4 w-[min(70%,180px)] rounded-[12px]" />
            <Skeleton className="h-[clamp(40px,11vw,58px)] w-[min(88%,240px)] rounded-[16px]" />
          </div>
          <div className="tti-pb mb-7">
            <div className="tti-pb-row tti-pb-row--end-only">
              <Skeleton className="h-14 w-28 rounded-[12px]" />
            </div>
            <Skeleton className="mt-2 h-3 w-full rounded-[999px]" />
            <Skeleton className="mx-auto mt-6 h-10 w-[min(92%,360px)] rounded-[999px]" />
          </div>
          <div className="rounded-[16px] border border-[rgba(45,32,32,0.12)] bg-white/80 p-4 shadow-[0_4px_24px_rgba(45,32,32,0.06)]">
            <Skeleton className="mb-4 h-5 w-32 rounded-[12px]" />
            <Skeleton className="mb-2 h-4 w-full rounded-[12px]" />
            <Skeleton className="mb-2 h-4 w-[94%] rounded-[12px]" />
            <Skeleton className="h-4 w-[78%] rounded-[12px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
