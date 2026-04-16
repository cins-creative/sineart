import type { Metadata } from "next";
import NavBar from "../_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { parseNhomSearchParam } from "@/lib/khoa-hoc-course-filters";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import "./khoa-hoc.css";
import KhoaHocBento from "./_components/KhoaHocBento";

export const metadata: Metadata = {
  title: "Khóa học — Sine Art",
  description:
    "Danh sách khóa học mỹ thuật — theo dữ liệu môn học, lớp mở và ghi danh.",
};

export default async function KhoaHocPage({
  searchParams,
}: {
  searchParams: Promise<{ nhom?: string }>;
}) {
  const params = await searchParams;
  const { courses } = await getKhoaHocPageData();
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);
  const nhom = parseNhomSearchParam(params.nhom);

  return (
    <div className="sa-root khoa-hoc-page">
      <NavBar khoaHocGroups={khoaHocGroups} />
      <KhoaHocBento courses={courses} initialFilter={nhom ?? "all"} />
    </div>
  );
}
