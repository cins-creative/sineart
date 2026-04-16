import NavBar from "../_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { parseNhomSearchParam } from "@/lib/khoa-hoc-course-filters";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import KhoaHocBento from "./_components/KhoaHocBento";

export async function KhoaHocPageContent({
  searchParams,
}: {
  searchParams: Promise<{ nhom?: string }>;
}) {
  const params = await searchParams;
  const { courses } = await getKhoaHocPageData();
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);
  const nhom = parseNhomSearchParam(params.nhom);

  return (
    <>
      <NavBar khoaHocGroups={khoaHocGroups} />
      <KhoaHocBento courses={courses} initialFilter={nhom ?? "all"} />
    </>
  );
}
