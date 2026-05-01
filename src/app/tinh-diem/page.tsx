import NavBar from "../_components/NavBar";
import TinhDiemClient from "./TinhDiemClient";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

export default async function TinhDiemPage() {
  const { courses } = await getKhoaHocPageData();
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  return (
    <div className="sa-root min-h-[100dvh] bg-[#fdf7f3] font-[family-name:var(--font-quicksand)] text-[#2d2020]">
      <NavBar khoaHocGroups={khoaHocGroups} />
      <div className="min-[900px]:pt-[76px]">
        <TinhDiemClient />
      </div>
    </div>
  );
}
