import type { HpResolvedKy } from "@/lib/data/hp-thu-hp-chi-tiet-ky";
import { calendarDaysRemainingInclusive } from "@/lib/utils";

/** Kỳ HP đã TT: còn ít nhất 1 ngày lịch trong kỳ (khớp phòng học / `fetchClassmatesForLop`). */
export function qlhvConNgayHocFromKyMap(
  kyMap: Map<number, HpResolvedKy>,
  enrollmentId: number
): boolean {
  const ky = kyMap.get(enrollmentId);
  const ngayCuoi = ky?.ngay_cuoi_ky?.trim().slice(0, 10) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayCuoi)) return false;
  const rem = calendarDaysRemainingInclusive(ngayCuoi);
  return rem !== null && rem > 0;
}
