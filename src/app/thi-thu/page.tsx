import type { Metadata } from "next";
import { Suspense } from "react";

import ThiThuFooter from "./ThiThuFooter";
import { ThiThuStyles } from "./ThiThuStyles";
import { ThiThuListSection } from "./_components/ThiThuListSection";
import { ThiThuListSectionSkeleton } from "./_components/ThiThuListSection.skeleton";
import { ThiThuNavBarSection } from "./_components/ThiThuNavBarSection";
import { ThiThuNavBarSectionSkeleton } from "./_components/ThiThuNavBarSection.skeleton";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Thi thử — Sine Art",
  description:
    "Thi thử mỹ thuật trực tuyến tại Sine Art — Hình họa, Trang trí màu, Bố cục màu.",
  alternates: { canonical: "https://sineart.vn/thi-thu" },
};

export default function ThiThuPage() {
  return (
    <div className="sa-root sa-thi-thu">
      <ThiThuStyles />

      <Suspense fallback={<ThiThuNavBarSectionSkeleton />}>
        <ThiThuNavBarSection navKey="thi-thu-list" />
      </Suspense>

      <section className="tti-hero">
        <div className="tti-hero-orb tti-hero-orb-1" aria-hidden />
        <div className="tti-hero-orb tti-hero-orb-2" aria-hidden />
        <div className="tti-hero-orb tti-hero-orb-3" aria-hidden />
        <div className="tti-hero-tag">
          <div className="tti-hero-tag-dot" aria-hidden />
          Phòng thi trực tuyến
        </div>
        <h1>
          Thi thử <span className="tti-em">Sine Art</span>
        </h1>
        <p className="tti-lead">
          Cọ xát thực chiến với đề thi chuẩn — phòng mở trước giờ làm bài 15 phút, vào đúng giờ để đếm ngược và nhận đề.
        </p>
      </section>

      <Suspense fallback={<ThiThuListSectionSkeleton />}>
        <ThiThuListSection />
      </Suspense>

      <ThiThuFooter />
    </div>
  );
}
