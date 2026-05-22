import NavBar from "@/app/_components/NavBar";
import { getKhoaHocNavGroups } from "@/lib/nav/build-khoa-hoc-nav";

/**
 * Fetch Supabase (khóa học) cho NavBar — bọc riêng trong `<Suspense>` ở `page.tsx`
 * để phần landing tĩnh / grid không bị chặn bởi `await getKhoaHocPageData()`.
 * Logic query giữ nguyên so với trước refactor.
 */
export async function KienThucLandingNav() {
  const khoaHocGroups = await getKhoaHocNavGroups();
  return <NavBar khoaHocGroups={khoaHocGroups} />;
}
