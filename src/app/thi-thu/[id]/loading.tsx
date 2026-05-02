import { ThiThuStyles } from "../ThiThuStyles";
import { ThiThuNavBarSectionSkeleton } from "../_components/ThiThuNavBarSection.skeleton";
import { ThiThuRoomRouteSkeleton } from "./_components/ThiThuRoomRouteSkeleton";

export default function ThiThuRoomLoading() {
  return (
    <div className="sa-root sa-thi-thu min-h-[100dvh]">
      <ThiThuStyles />
      <ThiThuNavBarSectionSkeleton />
      <div className="min-[900px]:pt-[76px]">
        <ThiThuRoomRouteSkeleton />
      </div>
    </div>
  );
}
