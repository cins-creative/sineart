import { Suspense, type ReactNode } from "react";

import HeroSection from "@/app/_components/HeroSection";
import VideoSection from "@/app/_components/VideoSection";
import WhySection from "@/app/_components/WhySection";
import {
  DEFAULT_HOME_CONTENT,
  type WhyContent,
} from "@/lib/admin/home-content-schema";
import { getHomeStatStripData } from "@/lib/data/home";
import { getHomeContent } from "@/lib/data/home-content";

import { HomeStatStripSection } from "./HomeStatStripSection";
import { HomeStatStripSectionSkeleton } from "./HomeStatStripSection.skeleton";

type Props = { children: ReactNode };

/**
 * Phần đầu trang chủ phụ thuộc CMS + stat strip — tách để `page.tsx` sync và stream skeleton ngay.
 */
export async function HomeLeadSections({ children }: Props) {
  const [homeContent, statStrip] = await Promise.all([
    getHomeContent(),
    getHomeStatStripData(),
  ]);

  const heroContent = {
    ...homeContent.hero,
    eyebrow: DEFAULT_HOME_CONTENT.hero.eyebrow,
    studentsTrust: `${statStrip.students} học viên`,
  };

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
    <>
      <HeroSection content={heroContent} />

      <Suspense fallback={<HomeStatStripSectionSkeleton />}>
        <HomeStatStripSection />
      </Suspense>

      <div className="page-inner">
        <WhySection content={whyContent} />
        <VideoSection content={homeContent.video} />
        {children}
      </div>
    </>
  );
}
