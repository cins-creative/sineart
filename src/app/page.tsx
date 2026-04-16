import { Suspense } from "react";
import { HomePageSkeleton } from "@/components/skeletons";
import "./sineart-home.css";
import { HomePageContent } from "./HomePageContent";

/** ISR — dữ liệu public; admin có `revalidatePath` khi đổi môn/lớp. */
export const revalidate = 300;

export default function Home() {
  return (
    <div className="sa-root">
      <Suspense fallback={<HomePageSkeleton />}>
        <HomePageContent />
      </Suspense>
    </div>
  );
}
