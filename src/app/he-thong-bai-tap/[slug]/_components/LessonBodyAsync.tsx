import { getBaiTapListForMon } from "@/lib/data/bai-tap";
import {
  exerciseIndexInSortedAsc,
  getHeThongBaiTapAccess,
} from "@/lib/data/hoc-vien-bai-tap-access";
import type { BaiTap } from "@/types/baiTap";
import HeThongBaiTapLockedGate from "../HeThongBaiTapLockedGate";
import HeThongBaiTapStudentOnlyGate from "../HeThongBaiTapStudentOnlyGate";
import HeThongBaiTapView from "../HeThongBaiTapView";

/**
 * Stream khối thân bài: fetch siblings + access cùng boundary.
 * Video + Thông tin bài + Breadcrumb đã render ở `page.tsx` nên không bị chặn.
 */
export default async function LessonBodyAsync({ bai }: { bai: BaiTap }) {
  const siblingsAll = await getBaiTapListForMon(bai.mon_hoc.id);
  const siblingsSorted = [...siblingsAll].sort((a, b) => a.bai_so - b.bai_so);
  const access = await getHeThongBaiTapAccess(bai.mon_hoc.id, siblingsSorted);

  const currentAscIndex = exerciseIndexInSortedAsc(siblingsSorted, bai.id);
  /** Môn thuộc loại «Luyện thi» = giáo trình khóa «Luyện thi tại lớp» — mở xem không cần đăng nhập Phòng học. */
  const isLuyenThiTaiLopMon = (bai.mon_hoc.loai_khoa_hoc ?? "").trim() === "Luyện thi";
  const accessOpen = (() => {
    if (!isLuyenThiTaiLopMon) return access;
    if (access.viewer === "hv" || access.viewer === "gv") return access;
    const last = siblingsSorted.length - 1;
    return { viewer: "hv" as const, maxAccessibleIndex: last >= 0 ? last : -1 };
  })();

  const canViewBaiTap = accessOpen.viewer === "hv" || accessOpen.viewer === "gv";
  const blocked =
    accessOpen.viewer === "hv" &&
    currentAscIndex >= 0 &&
    currentAscIndex > accessOpen.maxAccessibleIndex;
  const maxBaiSoLabel =
    accessOpen.maxAccessibleIndex >= 0 && siblingsSorted[accessOpen.maxAccessibleIndex]
      ? `Bài ${siblingsSorted[accessOpen.maxAccessibleIndex].bai_so}`
      : null;

  if (!canViewBaiTap) {
    return (
      <HeThongBaiTapStudentOnlyGate
        bai={bai}
        variant={accessOpen.viewer === "anon" ? "sign_in" : "not_student"}
      />
    );
  }

  if (blocked) {
    return <HeThongBaiTapLockedGate maxBaiSoLabel={maxBaiSoLabel} />;
  }

  return (
    <HeThongBaiTapView bai={bai} siblingsSorted={siblingsSorted} access={accessOpen} />
  );
}
