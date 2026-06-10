import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeMockupPage } from "@/app/_components/home-mockup/HomeMockupPage";
import { HomeSectionErrorBoundary } from "@/app/_components/home/HomeSectionErrorBoundary";
import { HomeLeadLoadingFallback } from "@/app/_components/home/HomeLeadLoadingFallback";
import { HomeNavSection } from "@/app/_components/home/HomeNavSection";
import { HomeNavSectionSkeleton } from "@/app/_components/home/HomeNavSection.skeleton";
import "../sineart-home.css";
import "../sineart-home-mockup.css";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sine Art (New) – Preview",
};

export default function NewHomePreviewPage() {
  return (
    <>
      <div className="sa-root">
        <Suspense fallback={<HomeNavSectionSkeleton />}>
          <HomeSectionErrorBoundary label="HomeNavSection">
            <HomeNavSection />
          </HomeSectionErrorBoundary>
        </Suspense>
      </div>
      <div className="sa-mockup">
        <Suspense fallback={<HomeLeadLoadingFallback />}>
          <HomeSectionErrorBoundary label="HomeMockupPage">
            <HomeMockupPage />
          </HomeSectionErrorBoundary>
        </Suspense>
      </div>
    </>
  );
}
