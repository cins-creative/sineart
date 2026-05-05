import { THANG_FULL_ORDER } from "@/lib/data/bao-cao-tai-chinh-config";

import type { MkDataAnalysisRow } from "@/lib/data/admin-report-mkt";

/** Chuỗi `YYYY-MM-DD` — so sánh chuỗi được với ISO date-only. */
export type YmdString = string;

export type MkDatePreset = "all" | "week" | "month" | "quarter" | "year" | "custom";

export type MkDateRangeBound = { startYmd: YmdString; endYmd: YmdString };

export function formatYMDLocal(d: Date): YmdString {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** `ngay_thang_nhap` trong DB — lấy phần ngày chuẩn ISO. */
export function rowDateYmd(row: MkDataAnalysisRow): YmdString | null {
  const s = row.ngay_thang_nhap?.trim();
  if (!s) return null;
  const ymd = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

export function formatYmdVi(ymd: YmdString): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("vi-VN");
}

/**
 * Preset tính **lùi từ hôm nay** (local):
 * - Tuần: 7 ngày gần nhất (bao gồm hôm nay)
 * - Tháng / Quý / Năm: từ đầu kỳ lịch đến hôm nay
 */
export function presetToRange(preset: Exclude<MkDatePreset, "all" | "custom">): MkDateRangeBound {
  const today = new Date();
  const endYmd = formatYMDLocal(today);
  if (preset === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  if (preset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  if (preset === "quarter") {
    const q = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), q * 3, 1);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  const start = new Date(today.getFullYear(), 0, 1);
  return { startYmd: formatYMDLocal(start), endYmd };
}

export function normalizeCustomRange(
  customFrom: string,
  customTo: string,
): MkDateRangeBound {
  const todayYmd = formatYMDLocal(new Date());
  let from = customFrom.trim().slice(0, 10);
  let to = customTo.trim().slice(0, 10);
  if (!from && !to) return { startYmd: todayYmd, endYmd: todayYmd };
  if (!from) from = to || todayYmd;
  if (!to) to = from || todayYmd;
  if (from > to) [from, to] = [to, from];
  return { startYmd: from, endYmd: to };
}

export function resolveActiveRange(
  preset: MkDatePreset,
  customFrom: string,
  customTo: string,
): MkDateRangeBound | null {
  if (preset === "all") return null;
  if (preset === "custom") return normalizeCustomRange(customFrom, customTo);
  return presetToRange(preset);
}

/** Tuần ISO trước (Thứ 2 → Chủ nhật), giờ địa phương. */
function previousIsoWeekRangeLocal(now: Date): MkDateRangeBound {
  const day = now.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
  const prevMonday = new Date(thisMonday);
  prevMonday.setDate(thisMonday.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);
  return { startYmd: formatYMDLocal(prevMonday), endYmd: formatYMDLocal(prevSunday) };
}

function previousCalendarMonthRangeLocal(now: Date): MkDateRangeBound {
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { startYmd: formatYMDLocal(first), endYmd: formatYMDLocal(last) };
}

function previousCalendarQuarterRangeLocal(now: Date): MkDateRangeBound {
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3);
  let pq = q - 1;
  let py = y;
  if (pq < 0) {
    pq = 3;
    py -= 1;
  }
  const sm = pq * 3;
  const start = new Date(py, sm, 1);
  const end = new Date(py, sm + 3, 0);
  return { startYmd: formatYMDLocal(start), endYmd: formatYMDLocal(end) };
}

function previousCalendarYearRangeLocal(now: Date): MkDateRangeBound {
  const y = now.getFullYear() - 1;
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31);
  return { startYmd: formatYMDLocal(start), endYmd: formatYMDLocal(end) };
}

/**
 * Dashboard overview: Tuần/Tháng/Quý/Năm = **kỳ liền trước** (-1), không gồm kỳ hiện tại.
 * (Trang nhập liệu khác vẫn dùng `presetToRange` / `resolveActiveRange`.)
 */
export function presetToOverviewMinusOneRange(
  preset: Exclude<MkDatePreset, "all" | "custom">,
): MkDateRangeBound {
  const now = new Date();
  switch (preset) {
    case "week":
      return previousIsoWeekRangeLocal(now);
    case "month":
      return previousCalendarMonthRangeLocal(now);
    case "quarter":
      return previousCalendarQuarterRangeLocal(now);
    case "year":
      return previousCalendarYearRangeLocal(now);
    default:
      return previousCalendarMonthRangeLocal(now);
  }
}

/** Overview marketing — preset «-1» hoặc custom. */
export function resolveOverviewActiveRange(
  preset: MkDatePreset,
  customFrom: string,
  customTo: string,
): MkDateRangeBound | null {
  if (preset === "all") return null;
  if (preset === "custom") return normalizeCustomRange(customFrom, customTo);
  return presetToOverviewMinusOneRange(preset);
}

/** Mọi cặp (năm, «Tháng n») có ngày thuộc [startYmd, endYmd] inclusive — phục vụ lọc BCTC theo kỳ. */
export function enumerateNamThangPairsInInclusiveRange(
  startYmd: string,
  endYmd: string,
): { nam: string; thang: string }[] {
  const s = startYmd.trim().slice(0, 10);
  const e = endYmd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) return [];
  const [ys, ms, ds] = s.split("-").map(Number);
  const [ye, me, de] = e.split("-").map(Number);
  const start = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  if (start > end) return [];
  const map = new Map<string, { nam: string; thang: string }>();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const nam = String(d.getFullYear());
    const thang = THANG_FULL_ORDER[d.getMonth()] ?? "";
    if (!thang) continue;
    map.set(`${nam}|${thang}`, { nam, thang });
  }
  return [...map.values()];
}

export function filterMkRowsByRange(
  rows: MkDataAnalysisRow[],
  range: MkDateRangeBound | null,
): MkDataAnalysisRow[] {
  if (!range) return rows;
  return rows.filter((r) => {
    const ymd = rowDateYmd(r);
    if (!ymd) return false;
    return ymd >= range.startYmd && ymd <= range.endYmd;
  });
}
