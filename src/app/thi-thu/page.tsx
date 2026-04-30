import type { Metadata } from "next";
import { Suspense } from "react";

import NavBar from "@/app/_components/NavBar";
import ThiThuFooter from "./ThiThuFooter";
import { ThiThuStyles } from "./ThiThuStyles";
import ThiThuListClient from "./ThiThuListClient";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { fetchThiThuPublishedList } from "@/lib/data/thi-thu";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Thi thử — Sine Art",
  description:
    "Thi thử mỹ thuật trực tuyến tại Sine Art — Hình họa, Trang trí màu, Bố cục màu.",
  alternates: { canonical: "https://sineart.vn/thi-thu" },
};

export default async function ThiThuPage() {
  const [{ courses }, rows] = await Promise.all([
    getKhoaHocPageData(),
    fetchThiThuPublishedList(),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  return (
    <div className="sa-root sa-thi-thu">
      <ThiThuStyles />
      <NavBar khoaHocGroups={khoaHocGroups} />

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

      <Suspense fallback={<div className="py-16 text-center text-sm text-neutral-600">Đang tải…</div>}>
        <ThiThuListClient rows={rows} />
      </Suspense>

      <ThiThuFooter />
    </div>
  );
}
