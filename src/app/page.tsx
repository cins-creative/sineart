import { Suspense } from "react";
import CtaBandSection from "./_components/CtaBandSection";
import LuuBaiHocVienFab from "./_components/LuuBaiHocVienFab";
import HeroSection from "./_components/HeroSection";
import VideoSection from "./_components/VideoSection";
import WhySection from "./_components/WhySection";
import { getHomeContent } from "@/lib/data/home-content";
import { HomeCareerSection } from "./_components/home/HomeCareerSection";
import { HomeCareerSectionSkeleton } from "./_components/home/HomeCareerSection.skeleton";
import { HomeGallerySection } from "./_components/home/HomeGallerySection";
import { HomeGallerySectionSkeleton } from "./_components/home/HomeGallerySection.skeleton";
import { HomeNavSection } from "./_components/home/HomeNavSection";
import { HomeNavSectionSkeleton } from "./_components/home/HomeNavSection.skeleton";
import { HomeReviewsSection } from "./_components/home/HomeReviewsSection";
import { HomeReviewsSectionSkeleton } from "./_components/home/HomeReviewsSection.skeleton";
import { HomeStatStripSection } from "./_components/home/HomeStatStripSection";
import { HomeStatStripSectionSkeleton } from "./_components/home/HomeStatStripSection.skeleton";
import { HomeTeachersSection } from "./_components/home/HomeTeachersSection";
import { HomeTeachersSectionSkeleton } from "./_components/home/HomeTeachersSection.skeleton";
import "./sineart-home.css";

/** ISR — dữ liệu public; admin có `revalidatePath` khi đổi môn/lớp. */
export const revalidate = 300;

export default async function Home() {
  const homeContent = await getHomeContent();

  return (
    <div className="sa-root">
      <Suspense fallback={<HomeNavSectionSkeleton />}>
        <HomeNavSection />
      </Suspense>

      <HeroSection content={homeContent.hero} />

      <Suspense fallback={<HomeStatStripSectionSkeleton />}>
        <HomeStatStripSection />
      </Suspense>

      <div className="page-inner">
        <WhySection content={homeContent.why} />
        <VideoSection content={homeContent.video} />
        <Suspense fallback={<HomeReviewsSectionSkeleton />}>
          <HomeReviewsSection />
        </Suspense>
        <Suspense fallback={<HomeGallerySectionSkeleton />}>
          <HomeGallerySection />
        </Suspense>
      </div>

      <Suspense fallback={<HomeCareerSectionSkeleton />}>
        <HomeCareerSection />
      </Suspense>

      <Suspense fallback={<HomeTeachersSectionSkeleton />}>
        <HomeTeachersSection />
      </Suspense>

      <CtaBandSection />

      <LuuBaiHocVienFab />
    </div>
  );
}
