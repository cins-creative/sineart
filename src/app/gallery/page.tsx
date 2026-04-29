import type { Metadata } from "next";

import NavBar from "../_components/NavBar";
import GalleryClient from "./GalleryClient";
import { GalleryStyles } from "./GalleryStyles";

import { getGalleryPagePayload } from "@/lib/data/home";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Thư viện bài vẽ học viên | Sine Art",
  description:
    "Bộ sưu tập bài vẽ từ lớp học tại Sine Art — không chỉnh sửa. Lọc theo môn học (Hình họa, Trang trí màu, Bố cục màu…) hoặc xem các bài mẫu chuẩn.",
  alternates: { canonical: "https://sineart.vn/gallery" },
};

export default async function GalleryPage() {
  const [{ courses }, payload] = await Promise.all([
    getKhoaHocPageData(),
    getGalleryPagePayload(),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  const total = payload.gallery.length;
  const totalMon = payload.galleryMonHocTabs.length;
  const totalBaiMau = payload.gallery.filter((g) => g.baiMau).length;
  const totalStudents = new Set(
    payload.gallery.map((g) => g.studentName.trim()).filter(Boolean),
  ).size;

  return (
    <div className="sa-root sa-gallery">
      <NavBar khoaHocGroups={khoaHocGroups} />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="page-hero">
        <div className="page-hero-bg" />
        <span className="blob blob-a" aria-hidden />
        <span className="blob blob-b" aria-hidden />
        <span className="blob blob-c" aria-hidden />
        <div className="page-hero-inner">
          <div>
            <div className="ph-eyebrow">
              <span className="dot">✦</span>
              Sine Art · {total > 0 ? `${total}+ tác phẩm` : "Thư viện tác phẩm"}
            </div>
            <h1>
              Sản phẩm từ <em>học viên</em> đã và đang học tại Sine Art
            </h1>
          </div>
          <div className="ph-side">
            <div className="ph-stat">
              <div className="n">
                <em>{total > 0 ? `${total}+` : "300+"}</em>
              </div>
              <div className="l">
                Tác phẩm học viên
                <br />
                <span>Từ các lớp Sine Art</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">{totalMon > 0 ? totalMon : 4}</div>
              <div className="l">
                Môn học
                <br />
                <span>Hình họa, trang trí màu…</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">
                {totalBaiMau > 0 ? totalBaiMau : totalStudents || "—"}
              </div>
              <div className="l">
                Bài mẫu chuẩn
                <br />
                <span>Được chọn làm tiêu chí</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOOLBAR + GRID + LIGHTBOX ────────────────────────────────── */}
      <GalleryClient
        items={payload.gallery}
        monHocTabs={payload.galleryMonHocTabs}
        itemsPerPage={40}
      />

      <GalleryStyles />
    </div>
  );
}
