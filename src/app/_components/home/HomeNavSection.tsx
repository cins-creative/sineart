import NavBar from "@/app/_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

export async function HomeNavSection() {
  const { courses } = await getKhoaHocPageData();
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);
  return <NavBar khoaHocGroups={khoaHocGroups} />;
}
