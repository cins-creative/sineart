import NavBar from "@/app/_components/NavBar";
import { getKhoaHocNavGroups } from "@/lib/nav/build-khoa-hoc-nav";

export async function DongHocPhiNavSection() {
  const khoaHocGroups = await getKhoaHocNavGroups();
  return <NavBar khoaHocGroups={khoaHocGroups} />;
}
