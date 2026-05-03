import LoadingProgressBar from "@/app/_components/LoadingProgressBar";
import { HomeLeadSectionsSkeleton } from "@/components/skeletons";

/** Khi RSC trang chủ còn fetch CMS — thanh brand + skeleton (vì `page` sync, `app/loading` có thể bỏ qua bước này). */
export function HomeLeadLoadingFallback() {
  return (
    <>
      <LoadingProgressBar />
      <HomeLeadSectionsSkeleton />
    </>
  );
}
