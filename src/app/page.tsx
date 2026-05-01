import type { Metadata } from "next";
import { Suspense } from "react";
import CtaBandSection from "./_components/CtaBandSection";
import LuuBaiHocVienFab from "./_components/LuuBaiHocVienFab";
import HeroSection from "./_components/HeroSection";
import VideoSection from "./_components/VideoSection";
import WhySection from "./_components/WhySection";
import {
  DEFAULT_HOME_CONTENT,
  type WhyContent,
} from "@/lib/admin/home-content-schema";
import { getHomeStatStripData } from "@/lib/data/home";
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

export const metadata: Metadata = {
  title: "Sine Art – Trường vẽ mỹ thuật nền tảng tại TP.HCM",
  description:
    "Học vẽ mỹ thuật tại TP.HCM — hình họa, bố cục màu, trang trí màu, luyện thi kiến trúc & đại học tại Sine Art.",
  alternates: { canonical: "https://sineart.vn/" },
  openGraph: { url: "https://sineart.vn/" },
};

export default async function Home() {
  const [homeContent, statStrip] = await Promise.all([
    getHomeContent(),
    getHomeStatStripData(),
  ]);

  /** Eyebrow + số học viên khớp nội dung chuẩn (không lấy từ CMS). */
  const heroContent = {
    ...homeContent.hero,
    eyebrow: DEFAULT_HOME_CONTENT.hero.eyebrow,
    studentsTrust: `${statStrip.students} học viên`,
  };

  /** `mkt_home_content` thường ghi đè bản trong code; đồng bộ copy section “Tại sao”. */
  const dw = DEFAULT_HOME_CONTENT.why;
  const whyContent: WhyContent = {
    ...homeContent.why,
    leadBody: dw.leadBody,
    pillars: [
      { ...homeContent.why.pillars[0], text: dw.pillars[0].text },
      { ...homeContent.why.pillars[1], text: dw.pillars[1].text },
      { ...homeContent.why.pillars[2], text: dw.pillars[2].text },
    ],
  };

  return (
    <div className="sa-root">
      <Suspense fallback={<HomeNavSectionSkeleton />}>
        <HomeNavSection />
      </Suspense>

      <HeroSection content={heroContent} />

      <Suspense fallback={<HomeStatStripSectionSkeleton />}>
        <HomeStatStripSection />
      </Suspense>

      <div className="page-inner">
        <WhySection content={whyContent} />
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
