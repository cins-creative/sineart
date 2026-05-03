import NavBar from "@/app/_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

/**
 * Fetch Supabase (khóa học) cho NavBar — bọc riêng trong `<Suspense>` ở `page.tsx`
 * để phần landing tĩnh / grid không bị chặn bởi `await getKhoaHocPageData()`.
 * Logic query giữ nguyên so với trước refactor.
 */
export async function KienThucLandingNav() {
  const { courses } = await getKhoaHocPageData();
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);
  return <NavBar khoaHocGroups={khoaHocGroups} />;
}
