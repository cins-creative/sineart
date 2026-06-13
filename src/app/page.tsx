import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeMockupPage } from "@/app/_components/home-mockup/HomeMockupPage";
import HomePageJsonLd from "./_components/HomePageJsonLd";
import { HomeSectionErrorBoundary } from "./_components/home/HomeSectionErrorBoundary";
import { HomeLeadLoadingFallback } from "./_components/home/HomeLeadLoadingFallback";
import { HomeNavSection } from "./_components/home/HomeNavSection";
import { HomeNavSectionSkeleton } from "./_components/home/HomeNavSection.skeleton";
import "./sineart-home.css";
import "./sineart-home-mockup.css";
import { SITE_OG_DEFAULT_IMAGE } from "@/lib/seo/site-jsonld";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sine Art – Trường vẽ mỹ thuật nền tảng tại TP.HCM",
  description:
    "Học vẽ mỹ thuật tại TP.HCM — hình họa, bố cục màu, trang trí màu, luyện thi kiến trúc & đại học tại Sine Art.",
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

export default function Home() {
  return (
    <>
      <HomePageJsonLd />
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
