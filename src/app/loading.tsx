import { HomePageSkeleton } from "@/components/skeletons";

/** Fallback điều hướng tới `/` — cùng layout với `page.tsx` */
export default function HomeLoading() {
  return (
    <div className="sa-root">
      <HomePageSkeleton />
    </div>
  );
}
