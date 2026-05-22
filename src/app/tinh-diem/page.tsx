import NavBar from "../_components/NavBar";
import TinhDiemClient from "./TinhDiemClient";
import { getKhoaHocNavGroups } from "@/lib/nav/build-khoa-hoc-nav";

export default async function TinhDiemPage() {
  const khoaHocGroups = await getKhoaHocNavGroups();

  return (
    <div className="sa-root min-h-[100dvh] bg-[#fdf7f3] font-[family-name:var(--font-quicksand)] text-[#2d2020]">
      <NavBar khoaHocGroups={khoaHocGroups} />
      <div className="min-[900px]:pt-[76px]">
        <TinhDiemClient />
      </div>
    </div>
  );
}
