import type { Metadata } from "next";
import NavBar from "../_components/NavBar";
import GallerySection from "../_components/GallerySection";
import TeachersSection from "../_components/TeachersSection";
import { getGalleryPagePayload } from "@/lib/data/home";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import "../sineart-home.css";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Bài học viên — Sine Art",
  description:
    "Tác phẩm học viên từ các lớp — lọc theo môn (Hình họa, Trang trí màu, Bố cục màu…). Cùng phong cách trang chủ.",
  alternates: { canonical: "https://sineart.vn/gallery" },
};

export default async function GalleryPage() {
  const [{ courses }, payload] = await Promise.all([
    getKhoaHocPageData(),
    getGalleryPagePayload(),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  return (
    <div className="sa-root gallery-page">
      <NavBar khoaHocGroups={khoaHocGroups} />
      <div className="page-inner gallery-page-inner">
        <h1 className="sr-only">Bài học viên — Sine Art</h1>
        <GallerySection
          items={payload.gallery}
          monHocTabs={payload.galleryMonHocTabs}
          sectionTitle="Bài học viên"
          galleryWrapId="bai-hoc-vien"
          layoutVariant="justified"
          itemsPerPage={40}
          showFooterCta={false}
          showSectionTitle={false}
        />
      </div>
      <TeachersSection slides={payload.teacherArtSlides} />
    </div>
  );
}
