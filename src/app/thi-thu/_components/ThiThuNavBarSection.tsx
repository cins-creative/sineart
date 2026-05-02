import NavBar from "@/app/_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

export async function ThiThuNavBarSection({
  lichChamUrl,
  navKey,
}: {
  /** Ảnh lịch chấm — chỉ có trên `/thi-thu/[id]`; danh sách truyền `undefined` → ẩn nút «Vào học». */
  lichChamUrl?: string | null;
  /** Reset state nav client khi đổi trang (vd `thi-thu-list` vs `id` phòng thi). */
  navKey?: string;
} = {}) {
  const { courses } = await getKhoaHocPageData();
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);
  return (
    <NavBar
      key={navKey ?? "thi-thu-nav"}
      khoaHocGroups={khoaHocGroups}
      thiThuLichChamUrl={lichChamUrl ?? null}
    />
  );
}
