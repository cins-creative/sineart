import NavBar from "@/app/_components/NavBar";
import { getKhoaHocNavGroups } from "@/lib/nav/build-khoa-hoc-nav";

export default async function NavBarAsync() {
  const khoaHocGroups = await getKhoaHocNavGroups();
  return <NavBar khoaHocGroups={khoaHocGroups} />;
}
