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
  const canViewBaiTap = access.viewer === "hv" || access.viewer === "gv";
  const blocked =
    access.viewer === "hv" &&
    currentAscIndex >= 0 &&
    currentAscIndex > access.maxAccessibleIndex;
  const maxBaiSoLabel =
    access.maxAccessibleIndex >= 0 && siblingsSorted[access.maxAccessibleIndex]
      ? `Bài ${siblingsSorted[access.maxAccessibleIndex].bai_so}`
      : null;

  if (!canViewBaiTap) {
    return (
      <HeThongBaiTapStudentOnlyGate
        bai={bai}
        variant={access.viewer === "anon" ? "sign_in" : "not_student"}
      />
    );
  }

  if (blocked) {
    return <HeThongBaiTapLockedGate maxBaiSoLabel={maxBaiSoLabel} />;
  }

  return (
    <HeThongBaiTapView bai={bai} siblingsSorted={siblingsSorted} access={access} />
  );
}
