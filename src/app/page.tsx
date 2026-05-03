import type { Metadata } from "next";
import { Suspense } from "react";
import CtaBandSection from "./_components/CtaBandSection";
import LuuBaiHocVienFab from "./_components/LuuBaiHocVienFab";
import { HomeCareerSection } from "./_components/home/HomeCareerSection";
import { HomeCareerSectionSkeleton } from "./_components/home/HomeCareerSection.skeleton";
import { HomeGallerySection } from "./_components/home/HomeGallerySection";
import { HomeGallerySectionSkeleton } from "./_components/home/HomeGallerySection.skeleton";
import { HomeLeadLoadingFallback } from "./_components/home/HomeLeadLoadingFallback";
import { HomeLeadSections } from "./_components/home/HomeLeadSections";
import { HomeNavSection } from "./_components/home/HomeNavSection";
import { HomeNavSectionSkeleton } from "./_components/home/HomeNavSection.skeleton";
import { HomeReviewsSection } from "./_components/home/HomeReviewsSection";
import { HomeReviewsSectionSkeleton } from "./_components/home/HomeReviewsSection.skeleton";
import { HomeTeachersSection } from "./_components/home/HomeTeachersSection";
import { HomeTeachersSectionSkeleton } from "./_components/home/HomeTeachersSection.skeleton";
import "./sineart-home.css";

/** ISR — dữ liệu public; admin có `revalidatePath` khi đổi môn/lớp. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sine Art – Trường vẽ mỹ thuật nền tảng tại TP.HCM",
  description:
    "Học vẽ mỹ thuật tại TP.HCM — hình họa, bố cục màu, trang trí màu, luyện thi kiến trúc & đại học tại Sine Art.",
  alternates: { canonical: "https://sineart.vn/" },
  openGraph: { url: "https://sineart.vn/" },
};

export default function Home() {
  return (
    <div className="sa-root">
      <Suspense fallback={<HomeNavSectionSkeleton />}>
        <HomeNavSection />
      </Suspense>

      <Suspense fallback={<HomeLeadLoadingFallback />}>
        <HomeLeadSections>
          <Suspense fallback={<HomeReviewsSectionSkeleton />}>
            <HomeReviewsSection />
          </Suspense>
          <Suspense fallback={<HomeGallerySectionSkeleton />}>
            <HomeGallerySection />
          </Suspense>
        </HomeLeadSections>
      </Suspense>

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
