import type { Metadata } from "next";
import { Suspense } from "react";
import CtaBandSection from "../_components/CtaBandSection";
import LuuBaiHocVienFab from "../_components/LuuBaiHocVienFab";
import { HomeCareerSection } from "../_components/home/HomeCareerSection";
import { HomeCareerSectionSkeleton } from "../_components/home/HomeCareerSection.skeleton";
import { HomeGallerySection } from "../_components/home/HomeGallerySection";
import { HomeGallerySectionSkeleton } from "../_components/home/HomeGallerySection.skeleton";
import { HomeLeadLoadingFallback } from "../_components/home/HomeLeadLoadingFallback";
import { HomeLeadSections } from "../_components/home/HomeLeadSections";
import { HomeNavSection } from "../_components/home/HomeNavSection";
import { HomeNavSectionSkeleton } from "../_components/home/HomeNavSection.skeleton";
import { HomeReviewsSection } from "../_components/home/HomeReviewsSection";
import { HomeReviewsSectionSkeleton } from "../_components/home/HomeReviewsSection.skeleton";
import { HomeClassroomPhotosSection } from "../_components/home/HomeClassroomPhotosSection";
import { HomeTeachersSection } from "../_components/home/HomeTeachersSection";
import { HomeTeachersSectionSkeleton } from "../_components/home/HomeTeachersSection.skeleton";
import { HomeSectionErrorBoundary } from "../_components/home/HomeSectionErrorBoundary";
import "../sineart-home.css";
import { SITE_OG_DEFAULT_IMAGE } from "@/lib/seo/site-jsonld";

/** ISR — dữ liệu public; admin có `revalidatePath` khi đổi môn/lớp. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sine Art – Trang chủ (cũ)",
  description:
    "Học vẽ mỹ thuật tại TP.HCM — hình họa, bố cục màu, trang trí màu, luyện thi kiến trúc & đại học tại Sine Art.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://sineart.vn/" },
  openGraph: {
    url: "https://sineart.vn/",
    images: [
      {
        url: SITE_OG_DEFAULT_IMAGE,
        width: 1200,
        height: 630,
        alt: "Sine Art – Trường vẽ mỹ thuật nền tảng tại TP.HCM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [SITE_OG_DEFAULT_IMAGE],
  },
};

export default function OldHomePage() {
  return (
    <div className="sa-root">
      <Suspense fallback={<HomeNavSectionSkeleton />}>
        <HomeSectionErrorBoundary label="HomeNavSection">
          <HomeNavSection />
        </HomeSectionErrorBoundary>
      </Suspense>

      <Suspense fallback={<HomeLeadLoadingFallback />}>
        <HomeSectionErrorBoundary label="HomeLeadSections">
          <HomeLeadSections>
            <Suspense fallback={<HomeReviewsSectionSkeleton />}>
              <HomeSectionErrorBoundary label="HomeReviewsSection">
                <HomeReviewsSection />
              </HomeSectionErrorBoundary>
            </Suspense>
            <Suspense fallback={<HomeGallerySectionSkeleton />}>
              <HomeSectionErrorBoundary label="HomeGallerySection">
                <HomeGallerySection />
              </HomeSectionErrorBoundary>
            </Suspense>
          </HomeLeadSections>
        </HomeSectionErrorBoundary>
      </Suspense>

      <Suspense fallback={<HomeCareerSectionSkeleton />}>
        <HomeSectionErrorBoundary label="HomeCareerSection">
          <HomeCareerSection />
        </HomeSectionErrorBoundary>
      </Suspense>

      <Suspense fallback={<HomeTeachersSectionSkeleton />}>
        <HomeSectionErrorBoundary label="HomeTeachersSection">
          <HomeTeachersSection />
        </HomeSectionErrorBoundary>
      </Suspense>

      <Suspense fallback={null}>
        <HomeSectionErrorBoundary label="HomeClassroomPhotosSection">
          <HomeClassroomPhotosSection />
        </HomeSectionErrorBoundary>
      </Suspense>

      <HomeSectionErrorBoundary label="CtaBandSection">
        <CtaBandSection />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary label="LuuBaiHocVienFab">
        <LuuBaiHocVienFab />
      </HomeSectionErrorBoundary>
    </div>
  );
}
