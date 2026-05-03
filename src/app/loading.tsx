import LoadingProgressBar from "@/app/_components/LoadingProgressBar";
import { GenericRouteLoading } from "@/components/skeletons";

/** Fallback khi segment đang stream — thanh giống Webflow + placeholder trung tính (mọi route dùng `app/`). */
export default function AppSegmentLoading() {
  return (
    <>
      <LoadingProgressBar />
      <GenericRouteLoading />
    </>
  );
}
