import "server-only";

import NavBar from "../../_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

/**
 * Async boundary tách việc fetch `courses` của NavBar khỏi critical render
 * của trang detail. Trước đây top-level `await Promise.all([...])` buộc
 * toàn bộ hero + body phải chờ query `courses` — query này không liên quan
 * tới nội dung bài nhưng là slowest của 3 fetch chính. Đặt vào Suspense
 * boundary để navbar stream vào sau hero.
 */
export default async function NavBarBoundary() {
  const { courses } = await getKhoaHocPageData();
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);
  return <NavBar khoaHocGroups={khoaHocGroups} />;
}
